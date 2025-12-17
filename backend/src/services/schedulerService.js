/**
 * Scheduler Service - Bin Packing Algorithm for Study Planning
 * Dynamically buckets lessons into days based on user settings
 */

/**
 * Generate a study schedule using bin-packing algorithm
 * @param {Object} course - The course document with modules and lessons
 * @param {Object} plan - The user's plan with settings and progress
 * @returns {Object} - Generated schedule with daily lesson assignments
 */
export function generateSchedule(course, plan) {
    const { settings, progress } = plan;
    const {
        start_date,
        daily_commitment_minutes,
        exclude_weekends
    } = settings;

    const completedSet = new Set(progress.completed_lesson_ids);

    // Flatten all lessons from all modules
    const allLessons = [];
    course.modules.forEach(module => {
        module.lessons.forEach(lesson => {
            allLessons.push({
                ...lesson,
                module_title: module.title,
                module_order: module.order,
                completed: completedSet.has(lesson.id)
            });
        });
    });

    // Separate completed and remaining lessons
    const completedLessons = allLessons.filter(l => l.completed);
    const remainingLessons = allLessons.filter(l => !l.completed);

    // Apply bin-packing to remaining lessons
    const scheduledDays = binPackLessons(
        remainingLessons,
        daily_commitment_minutes,
        new Date(start_date),
        exclude_weekends
    );

    // Calculate statistics
    const totalDuration = allLessons.reduce((sum, l) => sum + l.duration, 0);
    const completedDuration = completedLessons.reduce((sum, l) => sum + l.duration, 0);
    const remainingDuration = totalDuration - completedDuration;

    // Calculate estimated completion date
    const estimatedDays = scheduledDays.length;
    const today = new Date();
    const estimatedEndDate = new Date(today);
    estimatedEndDate.setDate(estimatedEndDate.getDate() + estimatedDays);

    return {
        total_lessons: allLessons.length,
        completed_lessons: completedLessons.length,
        remaining_lessons: remainingLessons.length,
        total_duration_minutes: totalDuration,
        completed_duration_minutes: completedDuration,
        remaining_duration_minutes: remainingDuration,
        progress_percentage: totalDuration > 0
            ? Math.round((completedDuration / totalDuration) * 100)
            : 0,
        estimated_completion_date: estimatedEndDate.toISOString().split('T')[0],
        days_remaining: estimatedDays,
        days: scheduledDays
    };
}

/**
 * Bin-packing algorithm to fit lessons into daily time slots
 * Uses First-Fit Decreasing (FFD) approach for optimal packing
 */
function binPackLessons(lessons, dailyMinutes, startDate, excludeWeekends) {
    if (lessons.length === 0) return [];

    // Sort lessons by duration (descending) for better packing
    const sortedLessons = [...lessons].sort((a, b) => b.duration - a.duration);

    const days = [];
    let currentDate = new Date(startDate);

    // Skip to next valid day if starting on weekend and weekends excluded
    if (excludeWeekends) {
        currentDate = getNextValidDay(currentDate, excludeWeekends);
    }

    // First-Fit Decreasing bin packing
    for (const lesson of sortedLessons) {
        let placed = false;

        // Try to fit in existing days
        for (const day of days) {
            if (day.remaining_minutes >= lesson.duration) {
                day.lessons.push(lesson);
                day.used_minutes += lesson.duration;
                day.remaining_minutes -= lesson.duration;
                placed = true;
                break;
            }
        }

        // Create new day if couldn't fit
        if (!placed) {
            // Handle lessons longer than daily commitment
            if (lesson.duration > dailyMinutes) {
                // Split long lessons across multiple days (conceptually mark them)
                days.push(createDay(currentDate, dailyMinutes, [lesson]));
            } else {
                days.push(createDay(currentDate, dailyMinutes, [lesson]));
            }

            // Move to next valid day
            currentDate = new Date(currentDate);
            currentDate.setDate(currentDate.getDate() + 1);
            if (excludeWeekends) {
                currentDate = getNextValidDay(currentDate, excludeWeekends);
            }
        }
    }

    // Re-sort lessons within each day by module order for better learning flow
    days.forEach(day => {
        day.lessons.sort((a, b) => {
            if (a.module_order !== b.module_order) {
                return a.module_order - b.module_order;
            }
            return a.id.localeCompare(b.id);
        });
    });

    // Add day numbers and format dates
    return days.map((day, index) => ({
        day_number: index + 1,
        date: day.date,
        date_formatted: formatDate(new Date(day.date)),
        is_today: isToday(new Date(day.date)),
        total_minutes: day.used_minutes,
        lesson_count: day.lessons.length,
        lessons: day.lessons.map(l => ({
            id: l.id,
            title: l.title,
            module: l.module_title,
            duration: l.duration,
            type: l.type,
            completed: l.completed
        }))
    }));
}

/**
 * Create a new day object
 */
function createDay(date, dailyMinutes, lessons = []) {
    const usedMinutes = lessons.reduce((sum, l) => sum + l.duration, 0);
    return {
        date: date.toISOString().split('T')[0],
        used_minutes: usedMinutes,
        remaining_minutes: dailyMinutes - usedMinutes,
        lessons
    };
}

/**
 * Get next valid day (skipping weekends if needed)
 */
function getNextValidDay(date, excludeWeekends) {
    const result = new Date(date);
    while (excludeWeekends && (result.getDay() === 0 || result.getDay() === 6)) {
        result.setDate(result.getDate() + 1);
    }
    return result;
}

/**
 * Format date for display
 */
function formatDate(date) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Check if date is today
 */
function isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

export default { generateSchedule };
