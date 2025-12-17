/**
 * Queue Service - RabbitMQ Integration for Background Job Processing
 */
import amqp from 'amqplib';
import ImportJob from '../models/ImportJob.js';
import Course from '../models/Course.js';
import { parseWithAI } from './aiService.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const QUEUE_NAME = 'import_jobs';

let channel = null;
let connection = null;

/**
 * Connect to RabbitMQ
 */
export async function connectQueue() {
    const maxRetries = 10;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            console.log(`🐰 Connecting to RabbitMQ (attempt ${retries + 1})...`);
            connection = await amqp.connect(RABBITMQ_URL);
            channel = await connection.createChannel();

            await channel.assertQueue(QUEUE_NAME, {
                durable: true  // Queue survives restart
            });

            console.log('✅ Connected to RabbitMQ');

            // Start consuming jobs
            startConsumer();

            return true;
        } catch (error) {
            retries++;
            console.log(`⚠️ RabbitMQ connection failed, retrying in 5s... (${retries}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    console.error('❌ Failed to connect to RabbitMQ after max retries');
    return false;
}

/**
 * Add a job to the queue
 */
export async function addToQueue(jobId) {
    if (!channel) {
        console.log('⚠️ Queue not connected, processing immediately...');
        // Fallback: process immediately without queue
        processJob(jobId);
        return;
    }

    channel.sendToQueue(QUEUE_NAME, Buffer.from(jobId), {
        persistent: true  // Message survives restart
    });

    console.log(`📥 Job ${jobId} added to queue`);
}

/**
 * Start consuming jobs from the queue
 */
function startConsumer() {
    if (!channel) return;

    channel.prefetch(1);  // Process one job at a time

    channel.consume(QUEUE_NAME, async (msg) => {
        if (msg === null) return;

        const jobId = msg.content.toString();
        console.log(`📤 Processing job ${jobId} from queue`);

        try {
            await processJob(jobId);
            channel.ack(msg);  // Mark as completed
        } catch (error) {
            console.error(`❌ Job ${jobId} failed:`, error.message);

            // Retry logic
            const job = await ImportJob.findById(jobId);
            if (job && job.attempts < job.max_attempts) {
                channel.nack(msg, false, true);  // Requeue
            } else {
                channel.ack(msg);  // Don't requeue, mark as failed
            }
        }
    });

    console.log('👂 Queue consumer started');
}

/**
 * Process a job - the actual AI parsing
 */
async function processJob(jobId) {
    const job = await ImportJob.findById(jobId);
    if (!job) {
        throw new Error('Job not found');
    }

    if (job.status !== 'pending') {
        console.log(`⏭️ Job ${jobId} already ${job.status}, skipping`);
        return;
    }

    try {
        // Update status to processing
        job.status = 'processing';
        job.attempts += 1;
        job.progress = { message: 'AI is parsing your syllabus...', percentage: 10 };
        await job.save();

        console.log(`🤖 Job ${jobId}: Starting AI parsing (attempt ${job.attempts})`);

        // Update progress
        job.progress = { message: 'Analyzing course structure...', percentage: 30 };
        await job.save();

        // Call AI service
        const parsedData = await parseWithAI(job.input.rawText);

        job.progress = { message: 'Saving course data...', percentage: 80 };
        await job.save();

        // Create course document
        const course = new Course({
            course_code: job.input.courseCode || parsedData.course_code || `COURSE-${Date.now()}`,
            title: parsedData.title || 'Untitled Course',
            platform: job.input.platform || parsedData.platform || 'Unknown',
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

        // Update job as completed
        job.status = 'completed';
        job.progress = { message: 'Import completed successfully!', percentage: 100 };
        job.result = {
            course_id: course._id,
            title: course.title,
            modules_count: course.modules.length,
            total_duration: course.total_duration_minutes
        };
        await job.save();

        console.log(`✅ Job ${jobId}: Completed - Created course "${course.title}"`);

    } catch (error) {
        console.error(`❌ Job ${jobId}: Failed -`, error.message);

        job.status = 'failed';
        job.progress = { message: 'Import failed', percentage: 0 };
        job.result = { error: error.message };
        await job.save();

        throw error;
    }
}

/**
 * Get queue status
 */
export async function getQueueStatus() {
    if (!channel) {
        return { connected: false, queue: QUEUE_NAME };
    }

    try {
        const queueInfo = await channel.checkQueue(QUEUE_NAME);
        return {
            connected: true,
            queue: QUEUE_NAME,
            messageCount: queueInfo.messageCount,
            consumerCount: queueInfo.consumerCount
        };
    } catch (error) {
        return { connected: false, error: error.message };
    }
}

export default { connectQueue, addToQueue, getQueueStatus };
