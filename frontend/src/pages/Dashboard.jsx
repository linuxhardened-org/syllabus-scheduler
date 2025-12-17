import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function Dashboard() {
    const [plans, setPlans] = useState([]);
    const [courses, setCourses] = useState([]);
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [plansRes, coursesRes, healthRes] = await Promise.all([
                fetch(`${API_URL}/plans`),
                fetch(`${API_URL}/courses`),
                fetch(`${API_URL}/health`)
            ]);

            const plansData = await plansRes.json();
            const coursesData = await coursesRes.json();
            const healthData = await healthRes.json();

            setPlans(plansData.data || []);
            setCourses(coursesData.data || []);
            setHealth(healthData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Track your learning progress across all courses</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
                <div className="card stat-card">
                    <div className="stat-value">{courses.length}</div>
                    <div className="stat-label">Courses</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-value">{plans.length}</div>
                    <div className="stat-label">Active Plans</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-value">
                        {health?.services?.ollama?.status === 'connected' ? '✅' : '❌'}
                    </div>
                    <div className="stat-label">AI Status</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-value">
                        {health?.services?.mongodb === 'connected' ? '✅' : '❌'}
                    </div>
                    <div className="stat-label">Database</div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div className="card-header">
                    <h3 className="card-title">Quick Actions</h3>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link to="/import" className="btn btn-primary">
                        🤖 Import Course with AI
                    </Link>
                    <Link to="/courses" className="btn btn-secondary">
                        📖 View All Courses
                    </Link>
                </div>
            </div>

            {/* Active Plans */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Your Study Plans</h3>
                    {plans.length > 0 && (
                        <span style={{ color: 'var(--text-muted)' }}>{plans.length} active</span>
                    )}
                </div>

                {plans.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <div className="empty-title">No study plans yet</div>
                        <p>Import a course and create your first study plan!</p>
                        <Link to="/import" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            Get Started
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-2">
                        {plans.map(plan => (
                            <Link
                                key={plan._id}
                                to={`/plan/${plan._id}`}
                                style={{ textDecoration: 'none' }}
                            >
                                <div className="card course-card" style={{ cursor: 'pointer' }}>
                                    <div className="course-platform">
                                        {plan.course_id?.platform || 'Unknown Platform'}
                                    </div>
                                    <div className="course-title">
                                        {plan.course_id?.title || 'Untitled Course'}
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${(plan.progress?.completed_lesson_ids?.length / (plan.course_id?.total_lessons || 1)) * 100}%` }}
                                        />
                                    </div>
                                    <div className="course-stats">
                                        <div className="course-stat">
                                            <div className="course-stat-value">
                                                {plan.progress?.completed_lesson_ids?.length || 0}
                                            </div>
                                            <div className="course-stat-label">Completed</div>
                                        </div>
                                        <div className="course-stat">
                                            <div className="course-stat-value">
                                                {plan.settings?.daily_commitment_minutes || 60}m
                                            </div>
                                            <div className="course-stat-label">Daily Goal</div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
