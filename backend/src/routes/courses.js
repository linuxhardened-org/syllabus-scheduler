import express from 'express';
import Course from '../models/Course.js';
import { parseWithAI } from '../services/aiService.js';
import * as cheerio from 'cheerio';

const router = express.Router();

// ===========================================
// GET /api/courses - List all courses
// ===========================================
router.get('/', async (req, res) => {
    try {
        const courses = await Course.find()
            .select('course_code title platform total_duration_minutes createdAt')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: courses.length,
            data: courses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===========================================
// POST /api/courses/fetch-url - Fetch syllabus from URL
// ===========================================
router.post('/fetch-url', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL is required'
            });
        }

        console.log('🌐 Fetching URL:', url);

        // Fetch the page content
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        if (!response.ok) {
            return res.status(400).json({
                success: false,
                error: `Failed to fetch URL: ${response.status} ${response.statusText}`
            });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract course information - try multiple selectors
        let title = $('h1').first().text().trim() ||
            $('title').text().trim() ||
            $('[class*="course-title"]').text().trim() ||
            'Unknown Course';

        // Extract platform from URL
        let platform = 'Unknown';
        try {
            const urlObj = new URL(url);
            platform = urlObj.hostname.replace('www.', '').split('.')[0];
            platform = platform.charAt(0).toUpperCase() + platform.slice(1);
        } catch (e) { }

        // Remove scripts, styles, and hidden elements
        $('script, style, nav, footer, header, [hidden], .hidden, [style*="display: none"]').remove();

        // Try to find course content/syllabus
        let syllabusText = '';

        // Try specific selectors for course platforms
        const selectors = [
            '[class*="curriculum"]',
            '[class*="syllabus"]',
            '[class*="course-content"]',
            '[class*="lesson-list"]',
            '[class*="module"]',
            '[class*="chapter"]',
            '[class*="section"]',
            '.accordion',
            '[role="list"]',
            'main',
            'article',
            '.content'
        ];

        for (const selector of selectors) {
            const content = $(selector).text().trim();
            if (content && content.length > 100) {
                syllabusText += content + '\n\n';
            }
        }

        // If no specific content found, get the body text
        if (!syllabusText || syllabusText.length < 200) {
            syllabusText = $('body').text();
        }

        // Clean up the text
        syllabusText = syllabusText
            .replace(/\s+/g, ' ')           // Normalize whitespace
            .replace(/\n\s*\n/g, '\n')      // Remove empty lines
            .trim();

        // Truncate if too long (AI has limits)
        if (syllabusText.length > 15000) {
            syllabusText = syllabusText.substring(0, 15000) + '...';
        }

        console.log(`📄 Extracted ${syllabusText.length} characters from ${url}`);

        if (syllabusText.length < 100) {
            return res.status(400).json({
                success: false,
                error: 'Could not extract course content. The page may require login or use JavaScript to load content.'
            });
        }

        res.json({
            success: true,
            data: {
                title,
                platform,
                url,
                rawText: syllabusText,
                extractedLength: syllabusText.length
            }
        });

    } catch (error) {
        console.error('❌ URL fetch error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch URL'
        });
    }
});

// ===========================================
// GET /api/courses/:id - Get single course
// ===========================================
router.get('/:id', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        res.json({
            success: true,
            data: course
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===========================================
// POST /api/courses/import - AI Import
// ===========================================
router.post('/import', async (req, res) => {
    try {
        const { rawText, platform, courseCode } = req.body;

        if (!rawText || rawText.trim().length < 50) {
            return res.status(400).json({
                success: false,
                error: 'Please provide syllabus text (at least 50 characters)'
            });
        }

        console.log('🤖 Starting AI parsing...');
        console.log(`📝 Input length: ${rawText.length} characters`);

        // Call AI service to parse the text
        const parsedData = await parseWithAI(rawText);

        // Create course document
        const course = new Course({
            course_code: courseCode || parsedData.course_code || `COURSE-${Date.now()}`,
            title: parsedData.title || 'Untitled Course',
            platform: platform || parsedData.platform || 'Unknown',
            total_duration_minutes: parsedData.total_duration_minutes || 0,
            modules: parsedData.modules || []
        });

        // Calculate total duration if not provided
        if (!course.total_duration_minutes) {
            course.total_duration_minutes = course.modules.reduce((total, module) => {
                return total + module.lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
            }, 0);
        }

        await course.save();

        console.log(`✅ Course saved: ${course.title}`);
        console.log(`📊 Modules: ${course.modules.length}, Total Duration: ${course.total_duration_minutes} min`);

        res.status(201).json({
            success: true,
            message: 'Course imported successfully',
            data: course
        });

    } catch (error) {
        console.error('❌ Import error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===========================================
// DELETE /api/courses/:id - Delete course
// ===========================================
router.delete('/:id', async (req, res) => {
    try {
        const course = await Course.findByIdAndDelete(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        // Also delete any study plans associated with this course
        const UserPlan = (await import('../models/UserPlan.js')).default;
        const deletedPlans = await UserPlan.deleteMany({ course_id: req.params.id });

        console.log(`🗑️ Deleted course: ${course.title} and ${deletedPlans.deletedCount} associated plans`);

        res.json({
            success: true,
            message: 'Course and associated plans deleted successfully',
            deletedPlans: deletedPlans.deletedCount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;

