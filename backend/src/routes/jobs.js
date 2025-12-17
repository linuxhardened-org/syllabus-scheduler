import express from 'express';
import ImportJob from '../models/ImportJob.js';
import { addToQueue, getQueueStatus } from '../services/queueService.js';

const router = express.Router();

// ===========================================
// POST /api/jobs/import - Submit import job to queue
// ===========================================
router.post('/import', async (req, res) => {
    try {
        const { rawText, platform, courseCode, sourceUrl } = req.body;

        if (!rawText || rawText.trim().length < 50) {
            return res.status(400).json({
                success: false,
                error: 'Please provide syllabus text (at least 50 characters)'
            });
        }

        // Create job in database
        const job = new ImportJob({
            status: 'pending',
            input: {
                rawText: rawText.trim(),
                platform,
                courseCode,
                sourceUrl
            },
            progress: {
                message: 'Job submitted, waiting in queue...',
                percentage: 0
            }
        });

        await job.save();
        console.log(`📝 Created import job ${job._id}`);

        // Add to queue for processing
        await addToQueue(job._id.toString());

        res.status(202).json({
            success: true,
            message: 'Import job submitted successfully',
            data: {
                job_id: job._id,
                status: job.status,
                progress: job.progress
            }
        });

    } catch (error) {
        console.error('❌ Job submission error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===========================================
// GET /api/jobs/:id - Get job status
// ===========================================
router.get('/:id', async (req, res) => {
    try {
        const job = await ImportJob.findById(req.params.id)
            .populate('result.course_id', 'title course_code');

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found'
            });
        }

        res.json({
            success: true,
            data: {
                job_id: job._id,
                status: job.status,
                progress: job.progress,
                result: job.result,
                attempts: job.attempts,
                createdAt: job.createdAt,
                updatedAt: job.updatedAt
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
// GET /api/jobs - List all jobs (recent)
// ===========================================
router.get('/', async (req, res) => {
    try {
        const jobs = await ImportJob.find()
            .sort({ createdAt: -1 })
            .limit(20)
            .select('status progress result createdAt updatedAt');

        res.json({
            success: true,
            count: jobs.length,
            data: jobs
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===========================================
// GET /api/jobs/queue/status - Get queue status
// ===========================================
router.get('/queue/status', async (req, res) => {
    try {
        const status = await getQueueStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===========================================
// DELETE /api/jobs/:id - Cancel/delete job
// ===========================================
router.delete('/:id', async (req, res) => {
    try {
        const job = await ImportJob.findById(req.params.id);

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found'
            });
        }

        // Can only delete pending or failed jobs
        if (job.status === 'processing') {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete a job that is currently processing'
            });
        }

        await ImportJob.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Job deleted successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
