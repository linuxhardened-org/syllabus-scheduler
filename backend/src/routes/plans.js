import express from 'express';
import UserPlan from '../models/UserPlan.js';
import Course from '../models/Course.js';
import { generateSchedule } from '../services/schedulerService.js';

const router = express.Router();

// ===========================================
// GET /api/plans - List all user plans
// ===========================================
router.get('/', async (req, res) => {
    try {
        const plans = await UserPlan.find()
            .populate('course_id', 'title course_code platform total_duration_minutes')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: plans.length,
            data: plans
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===========================================
// POST /api/plans - Create new study plan
// ===========================================
router.post('/', async (req, res) => {
    try {
        const {
            user_id = 'default_user',
            course_id,
            start_date,
            daily_commitment_minutes = 60,
            exclude_weekends = false
        } = req.body;

        // Validate course exists
        const course = await Course.findById(course_id);
        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        // Create plan
        const plan = new UserPlan({
            user_id,
            course_id,
            settings: {
                start_date: start_date || new Date(),
                daily_commitment_minutes,
                exclude_weekends
            },
            progress: {
                completed_lesson_ids: [],
                last_updated: new Date()
            }
        });

        await plan.save();

        res.status(201).json({
            success: true,
            message: 'Study plan created successfully',
            data: plan
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===========================================
// GET /api/plans/:id - Get single plan
// ===========================================
router.get('/:id', async (req, res) => {
    try {
        const plan = await UserPlan.findById(req.params.id)
            .populate('course_id');

        if (!plan) {
            return res.status(404).json({
                success: false,
                error: 'Plan not found'
            });
        }

        res.json({
            success: true,
            data: plan
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===========================================
// GET /api/plans/:id/schedule - Generate schedule
// ===========================================
router.get('/:id/schedule', async (req, res) => {
    try {
        const plan = await UserPlan.findById(req.params.id)
            .populate('course_id');

        if (!plan) {
            return res.status(404).json({
                success: false,
                error: 'Plan not found'
            });
        }

        // Generate the dynamic schedule
        const schedule = generateSchedule(plan.course_id, plan);

        res.json({
            success: true,
            data: {
                plan_id: plan._id,
                course_title: plan.course_id.title,
                settings: plan.settings,
                progress_summary: {
                    completed: plan.progress.completed_lesson_ids.length,
                    total: schedule.total_lessons
                },
                schedule: schedule.days
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===========================================
// PATCH /api/plans/:id/progress - Update progress
// ===========================================
router.patch('/:id/progress', async (req, res) => {
    try {
        const { lesson_ids, action = 'complete' } = req.body;

        if (!lesson_ids || !Array.isArray(lesson_ids)) {
            return res.status(400).json({
                success: false,
                error: 'lesson_ids array is required'
            });
        }

        const plan = await UserPlan.findById(req.params.id);

        if (!plan) {
            return res.status(404).json({
                success: false,
                error: 'Plan not found'
            });
        }

        if (action === 'complete') {
            // Add lessons to completed list (avoid duplicates)
            const currentCompleted = new Set(plan.progress.completed_lesson_ids);
            lesson_ids.forEach(id => currentCompleted.add(id));
            plan.progress.completed_lesson_ids = Array.from(currentCompleted);
        } else if (action === 'uncomplete') {
            // Remove lessons from completed list
            plan.progress.completed_lesson_ids = plan.progress.completed_lesson_ids
                .filter(id => !lesson_ids.includes(id));
        }

        plan.progress.last_updated = new Date();
        await plan.save();

        res.json({
            success: true,
            message: 'Progress updated successfully',
            data: {
                completed_count: plan.progress.completed_lesson_ids.length,
                last_updated: plan.progress.last_updated
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===========================================
// DELETE /api/plans/:id - Delete plan
// ===========================================
router.delete('/:id', async (req, res) => {
    try {
        const plan = await UserPlan.findByIdAndDelete(req.params.id);

        if (!plan) {
            return res.status(404).json({
                success: false,
                error: 'Plan not found'
            });
        }

        res.json({
            success: true,
            message: 'Plan deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
