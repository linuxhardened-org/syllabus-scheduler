/**
 * AI Service - Ollama Integration for Syllabus Parsing
 * Uses llama3.1 for intelligent text-to-JSON conversion
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';

/**
 * System prompt for structured syllabus parsing
 */
const SYSTEM_PROMPT = `You are a course syllabus parser. Your job is to extract structured data from raw course content.

RULES:
1. Extract ALL lessons/videos/sections from the provided text
2. Group lessons into logical modules/chapters
3. Estimate duration in MINUTES for each lesson (if not provided, estimate based on content type)
4. Generate unique lesson IDs using format: module_order + "_" + lesson_order (e.g., "1_01", "1_02", "2_01")
5. Identify lesson types: video, reading, quiz, lab, assignment, other
6. Return ONLY valid JSON, no explanation text

OUTPUT FORMAT (strict JSON):
{
  "title": "Course Title",
  "course_code": "COURSE-CODE",
  "platform": "Platform Name",
  "total_duration_minutes": 0,
  "modules": [
    {
      "title": "Module Title",
      "order": 1,
      "lessons": [
        {
          "id": "1_01",
          "title": "Lesson Title",
          "duration": 15,
          "type": "video"
        }
      ]
    }
  ]
}`;

/**
 * Parse raw syllabus text using Ollama AI
 * @param {string} rawText - The raw syllabus/course content to parse
 * @returns {Promise<Object>} - Parsed course structure
 */
export async function parseWithAI(rawText) {
    const userPrompt = `Parse the following course syllabus and extract structured data:

---BEGIN SYLLABUS---
${rawText}
---END SYLLABUS---

Return ONLY the JSON object, no other text.`;

    try {
        console.log(`🤖 Calling Ollama (${OLLAMA_MODEL})...`);

        const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: userPrompt,
                system: SYSTEM_PROMPT,
                stream: false,
                options: {
                    temperature: 0.1,  // Low temperature for consistent JSON output
                    num_predict: 4096  // Allow longer responses
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const aiResponse = data.response;

        console.log(`📄 AI Response length: ${aiResponse.length} chars`);

        // Extract JSON from the response
        const parsedData = extractJSON(aiResponse);

        // Validate the structure
        validateCourseStructure(parsedData);

        return parsedData;

    } catch (error) {
        console.error('❌ AI parsing failed:', error.message);
        throw new Error(`AI parsing failed: ${error.message}`);
    }
}

/**
 * Extract JSON from AI response (handles markdown code blocks)
 */
function extractJSON(text) {
    // Try to find JSON in code blocks first
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
        text = codeBlockMatch[1];
    }

    // Find the JSON object boundaries
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1) {
        throw new Error('No valid JSON object found in AI response');
    }

    let jsonString = text.slice(startIndex, endIndex + 1);

    // Try to parse directly first
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.log('⚠️ First JSON parse failed, attempting repairs...');
    }

    // Repair attempts for common AI JSON issues
    try {
        // Remove trailing commas before ] or }
        jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');

        // Replace single quotes with double quotes
        jsonString = jsonString.replace(/'/g, '"');

        // Fix unquoted keys
        jsonString = jsonString.replace(/(\{|\,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

        // Remove any text after the last }
        const lastBrace = jsonString.lastIndexOf('}');
        if (lastBrace !== -1) {
            jsonString = jsonString.slice(0, lastBrace + 1);
        }

        // Try parsing again
        try {
            return JSON.parse(jsonString);
        } catch (e2) {
            console.log('⚠️ Repaired JSON still invalid, trying incremental parse...');
        }

        // Last resort: Try to find a valid JSON by incrementally removing from end
        for (let i = jsonString.length - 1; i > startIndex + 50; i--) {
            if (jsonString[i] === '}') {
                const attempt = jsonString.slice(0, i + 1);
                try {
                    const result = JSON.parse(attempt);
                    console.log('✅ Found valid JSON by truncating');
                    return result;
                } catch (e3) {
                    // Continue trying
                }
            }
        }

        throw new Error('Could not repair JSON: ' + e.message);
    } catch (repairError) {
        throw new Error(`Invalid JSON in AI response: ${repairError.message}`);
    }
}

/**
 * Validate the parsed course structure
 */
function validateCourseStructure(data) {
    if (!data.title) {
        throw new Error('Missing required field: title');
    }

    if (!Array.isArray(data.modules)) {
        throw new Error('Missing or invalid field: modules (must be array)');
    }

    // Ensure modules have required fields
    data.modules.forEach((module, idx) => {
        if (!module.title) {
            module.title = `Module ${idx + 1}`;
        }
        if (typeof module.order !== 'number') {
            module.order = idx + 1;
        }
        if (!Array.isArray(module.lessons)) {
            module.lessons = [];
        }

        // Ensure lessons have required fields
        module.lessons.forEach((lesson, lessonIdx) => {
            if (!lesson.id) {
                lesson.id = `${module.order}_${String(lessonIdx + 1).padStart(2, '0')}`;
            }
            if (!lesson.title) {
                lesson.title = `Lesson ${lessonIdx + 1}`;
            }
            if (typeof lesson.duration !== 'number') {
                lesson.duration = 10; // Default 10 minutes
            }
            if (!lesson.type) {
                lesson.type = 'video';
            }
        });
    });

    return true;
}

/**
 * Check if Ollama model is available
 */
export async function checkModelAvailability() {
    try {
        const response = await fetch(`${OLLAMA_HOST}/api/tags`);
        if (!response.ok) return { available: false, reason: 'Ollama not responding' };

        const data = await response.json();
        const models = data.models || [];
        const hasModel = models.some(m => m.name.startsWith(OLLAMA_MODEL));

        return {
            available: hasModel,
            model: OLLAMA_MODEL,
            installedModels: models.map(m => m.name),
            reason: hasModel ? 'Model ready' : `Model ${OLLAMA_MODEL} not installed`
        };
    } catch (error) {
        return {
            available: false,
            reason: `Connection failed: ${error.message}`
        };
    }
}

export default { parseWithAI, checkModelAvailability };
