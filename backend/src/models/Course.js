import mongoose from 'mongoose';

// Lesson Schema (embedded)
const lessonSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    duration: {
        type: Number,  // in minutes
        default: 0
    },
    type: {
        type: String,
        enum: ['video', 'reading', 'quiz', 'lab', 'assignment', 'other'],
        default: 'video'
    }
}, { _id: false });

// Module Schema (embedded)
const moduleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    order: {
        type: Number,
        required: true
    },
    lessons: [lessonSchema]
}, { _id: false });

// Main Course Schema
const courseSchema = new mongoose.Schema({
    course_code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    platform: {
        type: String,
        trim: true,
        default: 'Unknown'
    },
    total_duration_minutes: {
        type: Number,
        default: 0
    },
    modules: [moduleSchema]
}, {
    timestamps: true
});

// Virtual: Get total lesson count
courseSchema.virtual('total_lessons').get(function () {
    if (!this.modules || !Array.isArray(this.modules)) return 0;
    return this.modules.reduce((count, module) => count + (module.lessons?.length || 0), 0);
});

// Ensure virtuals are included in JSON
courseSchema.set('toJSON', { virtuals: true });

const Course = mongoose.model('Course', courseSchema);

export default Course;
