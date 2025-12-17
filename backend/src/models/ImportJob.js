import mongoose from 'mongoose';

/**
 * Import Job Schema - Tracks AI import jobs in the queue
 */
const importJobSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    input: {
        rawText: { type: String, required: true },
        platform: String,
        courseCode: String,
        sourceUrl: String
    },
    result: {
        course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        title: String,
        modules_count: Number,
        total_duration: Number,
        error: String
    },
    progress: {
        message: { type: String, default: 'Waiting in queue...' },
        percentage: { type: Number, default: 0 }
    },
    attempts: { type: Number, default: 0 },
    max_attempts: { type: Number, default: 3 }
}, {
    timestamps: true
});

// Index for finding pending jobs
importJobSchema.index({ status: 1, createdAt: 1 });

const ImportJob = mongoose.model('ImportJob', importJobSchema);

export default ImportJob;
