import express from 'express';
import Course from '../models/Course.js';
import { parseWithAI } from '../services/aiService.js';

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

        res.json({
            success: true,
            message: 'Course deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
