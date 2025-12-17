import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function CourseDetail() {
    const { id } = useParams();
    const [course, setCourse] = useState(null);
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [expandedModules, setExpandedModules] = useState({});

    useEffect(() => {
        fetchCourseAndPlan();
    }, [id]);

    const fetchCourseAndPlan = async () => {
        try {
            const courseRes = await fetch(`${API_URL}/courses/${id}`);
            const courseData = await courseRes.json();
            if (courseData.success) {
                setCourse(courseData.data);
                // Expand first module by default
                if (courseData.data.modules?.length > 0) {
                    setExpandedModules({ 0: true });
                }
            }

            const plansRes = await fetch(`${API_URL}/plans`);
            const plansData = await plansRes.json();
            if (plansData.success) {
                const existingPlan = plansData.data.find(p => p.course_id?._id === id || p.course_id === id);
                if (existingPlan) {
                    const planRes = await fetch(`${API_URL}/plans/${existingPlan._id}`);
                    const planData = await planRes.json();
                    if (planData.success) {
                        setPlan(planData.data);
                    }
                } else {
                    // Auto-create a plan for tracking
                    const createRes = await fetch(`${API_URL}/plans`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            course_id: id,
                            start_date: new Date().toISOString(),
                            daily_commitment_minutes: 90
                        })
                    });
                    const createData = await createRes.json();
                    if (createData.success) {
                        setPlan(createData.data);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleLesson = async (lessonId) => {
        if (!plan) return;

        const isCompleted = plan.progress?.completed_lesson_ids?.includes(lessonId);
        setUpdating(true);

        try {
            await fetch(`${API_URL}/plans/${plan._id}/progress`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lesson_ids: [lessonId],
                    action: isCompleted ? 'uncomplete' : 'complete'
                })
            });

            const completedIds = new Set(plan.progress?.completed_lesson_ids || []);
            if (isCompleted) {
                completedIds.delete(lessonId);
            } else {
                completedIds.add(lessonId);
            }
            setPlan({
                ...plan,
                progress: {
                    ...plan.progress,
                    completed_lesson_ids: Array.from(completedIds)
                }
            });
        } catch (error) {
            console.error('Failed to update progress:', error);
        } finally {
            setUpdating(false);
        }
    };

    const toggleModule = (index) => {
        setExpandedModules(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const isLessonCompleted = (lessonId) => {
        return plan?.progress?.completed_lesson_ids?.includes(lessonId) || false;
    };

    const getTotalLessons = () => {
        if (!course?.modules) return 0;
        return course.modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
    };

    const getCompletedCount = () => {
        return plan?.progress?.completed_lesson_ids?.length || 0;
    };

    const getProgressPercentage = () => {
        const total = getTotalLessons();
        if (total === 0) return 0;
        return Math.round((getCompletedCount() / total) * 100);
    };

    const getModuleProgress = (module) => {
        if (!module.lessons || module.lessons.length === 0) return 0;
        const completed = module.lessons.filter(l => isLessonCompleted(l.id)).length;
        return Math.round((completed / module.lessons.length) * 100);
    };

    const getModuleDuration = (module) => {
        if (!module.lessons) return 0;
        return module.lessons.reduce((sum, l) => sum + (l.duration || 0), 0);
    };

    const formatDuration = (minutes) => {
        if (minutes < 60) return `${minutes} mins`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                <p>Loading course...</p>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="card">
                <div className="empty-state">
                    <div className="empty-icon">❌</div>
                    <div className="empty-title">Course not found</div>
                    <Link to="/courses" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        Back to Courses
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Hero Header with Orange Gradient */}
            <div className="course-hero">
                <div className="course-hero-content">
                    <div className="course-hero-icon">📚</div>
                    <div className="course-hero-info">
                        <h1 className="course-hero-title">{course.title}</h1>
                        <p className="course-hero-subtitle">
                            {course.platform} • {course.modules?.length || 0} Modules • {formatDuration(course.total_duration_minutes)}
                        </p>
                    </div>
                </div>
                <div className="course-hero-progress">
                    <div className="progress-label">PROGRESS</div>
                    <div className="progress-value">{getProgressPercentage()}%</div>
                </div>
                <div className="course-hero-bar">
                    <div className="course-hero-bar-fill" style={{ width: `${getProgressPercentage()}%` }} />
                </div>
            </div>

            {/* Stats Summary */}
            <div className="course-stats-row">
                <div className="course-stat-item">
                    <span className="stat-icon">✅</span>
                    <span>{getCompletedCount()} / {getTotalLessons()} lessons completed</span>
                </div>
                <div className="course-stat-item">
                    <span className="stat-icon">⏱️</span>
                    <span>{formatDuration(course.total_duration_minutes)} total</span>
                </div>
                <Link to="/courses" className="btn btn-secondary" style={{ marginLeft: 'auto' }}>
                    ← Back to Courses
                </Link>
            </div>

            {/* Modules List */}
            <div className="modules-container">
                {course.modules?.map((module, moduleIdx) => {
                    const isExpanded = expandedModules[moduleIdx];
                    const moduleProgress = getModuleProgress(module);
                    const completedInModule = module.lessons?.filter(l => isLessonCompleted(l.id)).length || 0;

                    return (
                        <div key={moduleIdx} className="module-card">
                            {/* Module Header */}
                            <div
                                className="module-header"
                                onClick={() => toggleModule(moduleIdx)}
                            >
                                <div className="module-number">{module.order || moduleIdx + 1}</div>
                                <div className="module-info">
                                    <div className="module-title">{module.title}</div>
                                    <div className="module-meta">
                                        <span>⏱️ {formatDuration(getModuleDuration(module))}</span>
                                        <span>•</span>
                                        <span>{module.lessons?.length || 0} lessons</span>
                                    </div>
                                </div>
                                <div className="module-progress-badge" style={{
                                    background: moduleProgress === 100 ? 'var(--success)' : 'var(--bg-card)'
                                }}>
                                    {moduleProgress}%
                                </div>
                                <div className={`module-expand ${isExpanded ? 'expanded' : ''}`}>
                                    ▼
                                </div>
                            </div>

                            {/* Module Lessons */}
                            {isExpanded && (
                                <div className="module-lessons">
                                    {module.lessons?.map((lesson, lessonIdx) => {
                                        const completed = isLessonCompleted(lesson.id);
                                        return (
                                            <label
                                                key={lessonIdx}
                                                className={`lesson-row ${completed ? 'completed' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={completed}
                                                    onChange={() => !updating && toggleLesson(lesson.id)}
                                                    disabled={updating}
                                                    className="lesson-checkbox-input"
                                                />
                                                <span className="lesson-checkbox-custom"></span>
                                                <span className={`lesson-name ${completed ? 'completed' : ''}`}>
                                                    {lesson.title}
                                                </span>
                                                <span className="lesson-time">({lesson.duration}:{String(Math.floor(Math.random() * 60)).padStart(2, '0')})</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default CourseDetail;
