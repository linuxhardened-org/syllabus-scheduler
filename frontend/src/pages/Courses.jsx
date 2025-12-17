import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function Courses() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreatePlan, setShowCreatePlan] = useState(null);
    const [planSettings, setPlanSettings] = useState({
        daily_commitment_minutes: 60,
        exclude_weekends: false
    });

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const response = await fetch(`${API_URL}/courses`);
            const data = await response.json();
            setCourses(data.data || []);
        } catch (error) {
            console.error('Failed to fetch courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteCourse = async (id) => {
        if (!confirm('Delete this course? This cannot be undone.')) return;

        try {
            await fetch(`${API_URL}/courses/${id}`, { method: 'DELETE' });
            setCourses(courses.filter(c => c._id !== id));
        } catch (error) {
            console.error('Failed to delete course:', error);
        }
    };

    const createPlan = async (courseId) => {
        try {
            const response = await fetch(`${API_URL}/plans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: courseId,
                    start_date: new Date().toISOString(),
                    ...planSettings
                })
            });

            const data = await response.json();
            if (data.success) {
                alert('Study plan created! Check your dashboard.');
                setShowCreatePlan(null);
            }
        } catch (error) {
            console.error('Failed to create plan:', error);
        }
    };

    const formatDuration = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                <p>Loading courses...</p>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">Courses</h1>
                    <p className="page-subtitle">All your imported courses</p>
                </div>
                <Link to="/import" className="btn btn-primary">
                    ➕ Import New Course
                </Link>
            </div>

            {courses.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">📚</div>
                        <div className="empty-title">No courses yet</div>
                        <p>Import your first course using AI</p>
                        <Link to="/import" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            🤖 Import with AI
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-2">
                    {courses.map(course => (
                        <div key={course._id} className="card course-card">
                            <div className="course-platform">{course.platform}</div>
                            <div className="course-title">{course.title}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                Code: {course.course_code}
                            </div>

                            <div className="course-stats">
                                <div className="course-stat">
                                    <div className="course-stat-value">{course.total_lessons || '—'}</div>
                                    <div className="course-stat-label">Lessons</div>
                                </div>
                                <div className="course-stat">
                                    <div className="course-stat-value">
                                        {formatDuration(course.total_duration_minutes || 0)}
                                    </div>
                                    <div className="course-stat-label">Duration</div>
                                </div>
                            </div>

                            {showCreatePlan === course._id ? (
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Daily commitment (minutes)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={planSettings.daily_commitment_minutes}
                                            onChange={(e) => setPlanSettings({
                                                ...planSettings,
                                                daily_commitment_minutes: parseInt(e.target.value) || 60
                                            })}
                                            min="15"
                                            max="480"
                                        />
                                    </div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={planSettings.exclude_weekends}
                                            onChange={(e) => setPlanSettings({
                                                ...planSettings,
                                                exclude_weekends: e.target.checked
                                            })}
                                        />
                                        <span style={{ color: 'var(--text-secondary)' }}>Skip weekends</span>
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className="btn btn-success"
                                            onClick={() => createPlan(course._id)}
                                            style={{ flex: 1 }}
                                        >
                                            Create Plan
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => setShowCreatePlan(null)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setShowCreatePlan(course._id)}
                                        style={{ flex: 1 }}
                                    >
                                        📅 Create Study Plan
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => deleteCourse(course._id)}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Courses;
