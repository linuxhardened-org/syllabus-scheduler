import mongoose from 'mongoose';

// Settings Schema (embedded)
const settingsSchema = new mongoose.Schema({
    start_date: {
        type: Date,
        required: true,
        default: Date.now
    },
    daily_commitment_minutes: {
        type: Number,
        required: true,
        default: 60,
        min: 15,
        max: 480  // Max 8 hours per day
    },
    exclude_weekends: {
        type: Boolean,
        default: false
    }
}, { _id: false });

// Progress Schema (embedded)
const progressSchema = new mongoose.Schema({
    completed_lesson_ids: [{
        type: String
    }],
    last_updated: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

// Main UserPlan Schema
const userPlanSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        default: 'default_user'
    },
    course_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    settings: {
        type: settingsSchema,
        required: true,
        default: () => ({})
    },
    progress: {
        type: progressSchema,
        required: true,
        default: () => ({
            completed_lesson_ids: [],
            last_updated: new Date()
        })
    }
}, {
    timestamps: true
});

// Index for faster queries
userPlanSchema.index({ user_id: 1, course_id: 1 });

const UserPlan = mongoose.model('UserPlan', userPlanSchema);

export default UserPlan;
