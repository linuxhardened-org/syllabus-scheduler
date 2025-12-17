import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function PlanView() {
    const { id } = useParams();
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchSchedule();
    }, [id]);

    const fetchSchedule = async () => {
        try {
            const response = await fetch(`${API_URL}/plans/${id}/schedule`);
            const data = await response.json();
            if (data.success) {
                setSchedule(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch schedule:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleLesson = async (lessonId, isCompleted) => {
        setUpdating(true);
        try {
            await fetch(`${API_URL}/plans/${id}/progress`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lesson_ids: [lessonId],
                    action: isCompleted ? 'uncomplete' : 'complete'
                })
            });
            await fetchSchedule();
        } catch (error) {
            console.error('Failed to update progress:', error);
        } finally {
            setUpdating(false);
        }
    };

    const getBadgeClass = (type) => {
        const types = { video: 'badge-video', lab: 'badge-lab', quiz: 'badge-quiz', reading: 'badge-reading' };
        return types[type] || 'badge-video';
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                <p>Loading schedule...</p>
            </div>
        );
    }

    if (!schedule) {
        return (
            <div className="card">
                <div className="empty-state">
                    <div className="empty-icon">❌</div>
                    <div className="empty-title">Plan not found</div>
                    <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <Link to="/" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>
                    ← Back to Dashboard
                </Link>
                <h1 className="page-title">{schedule.course_title}</h1>
                <p className="page-subtitle">Your personalized study schedule</p>
            </div>

            {/* Progress Stats */}
            <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
                <div className="card stat-card">
                    <div className="stat-value">{schedule.progress_summary.completed}</div>
                    <div className="stat-label">Completed</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-value">{schedule.progress_summary.total}</div>
                    <div className="stat-label">Total Lessons</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-value">{schedule.schedule.progress_percentage || 0}%</div>
                    <div className="stat-label">Progress</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-value">{schedule.schedule.days_remaining || 0}</div>
                    <div className="stat-label">Days Left</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Overall Progress</span>
                    <span>{schedule.schedule.progress_percentage || 0}%</span>
                </div>
                <div className="progress-bar" style={{ height: '12px' }}>
                    <div
                        className="progress-fill"
                        style={{ width: `${schedule.schedule.progress_percentage || 0}%` }}
                    />
                </div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '0.75rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)'
                }}>
                    <span>{schedule.schedule.completed_duration_minutes || 0} min completed</span>
                    <span>{schedule.schedule.remaining_duration_minutes || 0} min remaining</span>
                </div>
            </div>

            {/* Daily Schedule */}
            <h2 style={{ marginBottom: '1rem' }}>Daily Schedule</h2>

            {schedule.schedule.days?.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">🎉</div>
                        <div className="empty-title">All done!</div>
                        <p>You've completed all lessons in this course!</p>
                    </div>
                </div>
            ) : (
                schedule.schedule.days?.map((day) => (
                    <div key={day.day_number} className="day-card">
                        <div className={`day-header ${day.is_today ? 'today' : ''}`}>
                            <div>
                                <div className="day-title">
                                    Day {day.day_number}
                                    {day.is_today && <span style={{
                                        marginLeft: '0.5rem',
                                        background: 'var(--accent-gradient)',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem'
                                    }}>TODAY</span>}
                                </div>
                                <div className="day-date">{day.date_formatted}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: '600' }}>{day.total_minutes} min</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {day.lesson_count} lessons
                                </div>
                            </div>
                        </div>

                        <div className="day-lessons">
                            {day.lessons.map((lesson) => (
                                <div
                                    key={lesson.id}
                                    className={`lesson-item ${lesson.completed ? 'completed' : ''}`}
                                >
                                    <div
                                        className={`lesson-checkbox ${lesson.completed ? 'checked' : ''}`}
                                        onClick={() => !updating && toggleLesson(lesson.id, lesson.completed)}
                                        style={{ cursor: updating ? 'wait' : 'pointer' }}
                                    />
                                    <div className="lesson-info">
                                        <div className="lesson-title">{lesson.title}</div>
                                        <div className="lesson-meta">
                                            <span className={`badge ${getBadgeClass(lesson.type)}`}>
                                                {lesson.type}
                                            </span>
                                            <span style={{ marginLeft: '0.5rem' }}>{lesson.module}</span>
                                        </div>
                                    </div>
                                    <div className="lesson-duration">{lesson.duration} min</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

export default PlanView;
