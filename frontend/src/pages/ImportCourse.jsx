import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function ImportCourse() {
    const navigate = useNavigate();
    const [rawText, setRawText] = useState('');
    const [platform, setPlatform] = useState('');
    const [courseCode, setCourseCode] = useState('');
    const [courseUrl, setCourseUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingUrl, setFetchingUrl] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [importMode, setImportMode] = useState('paste'); // 'paste' or 'url'
    const [activeJob, setActiveJob] = useState(null);
    const [queueStatus, setQueueStatus] = useState(null);
    const pollInterval = useRef(null);

    // Fetch queue status
    useEffect(() => {
        const fetchQueueStatus = async () => {
            try {
                const response = await fetch(`${API_URL}/jobs/queue/status`);
                const data = await response.json();
                if (data.success) {
                    setQueueStatus(data.data);
                }
            } catch (e) { console.error('Queue status fetch failed', e); }
        };

        fetchQueueStatus();
        const interval = setInterval(fetchQueueStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    // Check for existing job in localStorage on mount
    useEffect(() => {
        const savedJobId = localStorage.getItem('activeImportJobId');
        if (savedJobId) {
            fetchJobDetails(savedJobId);
        }
    }, []);

    const fetchJobDetails = async (jobId) => {
        try {
            const response = await fetch(`${API_URL}/jobs/${jobId}`);
            const data = await response.json();
            if (data.success) {
                const job = data.data;
                setActiveJob(job);

                if (job.status === 'completed') {
                    setSuccess(`Course "${job.result.title}" imported successfully! ${job.result.modules_count || 0} modules found.`);
                    localStorage.removeItem('activeImportJobId');
                    setTimeout(() => navigate('/courses'), 3000);
                } else if (job.status === 'failed') {
                    setError('Import failed: ' + (job.result.error || 'Unknown error'));
                    localStorage.removeItem('activeImportJobId');
                }
            } else {
                localStorage.removeItem('activeImportJobId');
            }
        } catch (e) {
            localStorage.removeItem('activeImportJobId');
        }
    };

    // Poll for job status if there's an active job
    useEffect(() => {
        if (activeJob && ['pending', 'processing'].includes(activeJob.status)) {
            pollInterval.current = setInterval(checkJobStatus, 2000);
        } else if (pollInterval.current) {
            clearInterval(pollInterval.current);
        }

        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [activeJob]);

    const checkJobStatus = async () => {
        if (!activeJob) return;

        try {
            const response = await fetch(`${API_URL}/jobs/${activeJob.job_id}`);
            const data = await response.json();

            if (data.success) {
                const job = data.data;
                setActiveJob(job);

                if (job.status === 'completed') {
                    setSuccess(`Course "${job.result.title}" imported successfully! ${job.result.modules_count || 0} modules found.`);
                    setLoading(false);
                    setRawText('');
                    localStorage.removeItem('activeImportJobId');

                    // Navigate to dashboard after 2 seconds
                    setTimeout(() => navigate('/courses'), 2000);
                } else if (job.status === 'failed') {
                    setError('Import failed: ' + (job.result.error || 'Unknown error'));
                    setLoading(false);
                    localStorage.removeItem('activeImportJobId');
                }
            }
        } catch (err) {
            console.error('Failed to check job status:', err);
        }
    };

    const handleFetchUrl = async () => {
        if (!courseUrl.trim()) {
            setError('Please enter a course URL');
            return;
        }

        setFetchingUrl(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/courses/fetch-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: courseUrl })
            });

            const data = await response.json();

            if (data.success) {
                setRawText(data.data.rawText);
                setPlatform(data.data.platform);
                setSuccess(`Extracted ${data.data.extractedLength} characters from URL. Now click "Import with AI" to process.`);
            } else {
                setError(data.error || 'Failed to fetch URL');
            }
        } catch (err) {
            setError('Failed to fetch URL: ' + err.message);
        } finally {
            setFetchingUrl(false);
        }
    };

    const handleImport = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`${API_URL}/jobs/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rawText,
                    platform,
                    courseCode,
                    sourceUrl: importMode === 'url' ? courseUrl : undefined
                })
            });

            const data = await response.json();

            if (data.success) {
                setActiveJob(data.data);
                localStorage.setItem('activeImportJobId', data.data.job_id);
                setSuccess('Import job submitted! AI is processing in the background...');
            } else {
                setError(data.error || 'Import failed');
                setLoading(false);
            }
        } catch (err) {
            setError('Failed to submit job: ' + err.message);
            setLoading(false);
        }
    };

    const exampleText = `Course: Certified Kubernetes Administrator (CKA)
Platform: KodeKloud

Module 1: Core Concepts
- Cluster Architecture (15 min video)
- API Primitives (12 min video)
- Pods Overview (10 min video)
- Lab: Create Pods (20 min lab)

Module 2: Scheduling
- Manual Scheduling (8 min video)
- Labels and Selectors (10 min video)
- Taints and Tolerations (15 min video)
- Node Affinity (12 min video)

Module 3: Logging & Monitoring
- Monitor Cluster Components (10 min video)
- Managing Application Logs (8 min video)`;

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">🤖 AI Course Import</h1>
                <p className="page-subtitle">
                    Paste your course syllabus or fetch from URL - AI will parse it into structured data
                </p>
            </div>

            {error && (
                <div className="alert alert-error">
                    <span>❌</span> {error}
                </div>
            )}

            {success && !activeJob && (
                <div className="alert alert-success">
                    <span>✅</span> {success}
                </div>
            )}

            {/* Active Job Status */}
            {activeJob && (
                <div className="card" style={{
                    borderLeft: `4px solid ${activeJob.status === 'failed' ? 'var(--error)' : 'var(--primary)'}`,
                    marginBottom: '1.5rem',
                    background: 'var(--bg-secondary)'
                }}>
                    <div style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <strong>Processing Status</strong>
                            <span className={`badge badge-${activeJob.status === 'completed' ? 'success' : activeJob.status === 'failed' ? 'error' : 'warning'}`}>
                                {activeJob.status.toUpperCase()}
                            </span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                            {activeJob.progress?.message || 'Waiting in queue...'}
                        </p>

                        {activeJob.status !== 'completed' && activeJob.status !== 'failed' && (
                            <div className="progress-bar" style={{ marginTop: '0.75rem', height: '8px', background: 'var(--bg-card)' }}>
                                <div
                                    className="progress-fill"
                                    style={{
                                        width: `${activeJob.progress?.percentage || 5}%`,
                                        background: 'var(--primary-gradient)',
                                        height: '100%',
                                        borderRadius: '4px',
                                        transition: 'width 0.5s ease'
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Form Section - Always visible now */}
            <div className="grid grid-2">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Course Content</h3>
                    </div>

                    {/* Import Mode Toggle */}
                    <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginBottom: '1.5rem',
                        background: 'var(--bg-secondary)',
                        padding: '0.25rem',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        <button
                            type="button"
                            className={`btn ${importMode === 'paste' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1, padding: '0.5rem' }}
                            onClick={() => setImportMode('paste')}
                        >
                            📋 Paste Text
                        </button>
                        <button
                            type="button"
                            className={`btn ${importMode === 'url' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1, padding: '0.5rem' }}
                            onClick={() => setImportMode('url')}
                        >
                            🌐 From URL
                        </button>
                    </div>

                    {/* URL Input Section */}
                    {importMode === 'url' && (
                        <div className="form-group" style={{
                            padding: '1rem',
                            background: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '1rem'
                        }}>
                            <label className="form-label">Course URL</label>
                            <input
                                type="url"
                                className="form-input"
                                placeholder="https://learn.kodekloud.com/user/courses/..."
                                value={courseUrl}
                                onChange={(e) => setCourseUrl(e.target.value)}
                            />
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleFetchUrl}
                                disabled={fetchingUrl || !courseUrl.trim()}
                                style={{ width: '100%', marginTop: '0.75rem' }}
                            >
                                {fetchingUrl ? (
                                    <>
                                        <div className="spinner" style={{ width: '16px', height: '16px', margin: 0 }}></div>
                                        Fetching...
                                    </>
                                ) : (
                                    <>🔍 Fetch Course Content</>
                                )}
                            </button>
                            <small style={{ color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block' }}>
                                ⚠️ Note: Some platforms require login. If fetch fails, copy-paste the content manually.
                            </small>
                        </div>
                    )}

                    <form onSubmit={handleImport}>
                        <div className="form-group">
                            <label className="form-label">Platform (optional)</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g., KodeKloud, Udemy, Coursera"
                                value={platform}
                                onChange={(e) => setPlatform(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Course Code (optional)</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g., CKA-2024, AWS-SAA"
                                value={courseCode}
                                onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Raw Syllabus Content *</label>
                            <textarea
                                className="form-textarea"
                                placeholder="Paste your course outline, syllabus, or table of contents here..."
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                style={{ minHeight: '300px' }}
                                required
                            />
                            <small style={{ color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block' }}>
                                {rawText.length} characters • Minimum 50 required
                            </small>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || rawText.length < 50}
                            style={{ width: '100%' }}
                        >
                            {loading ? (
                                <>Processing in background...</>
                            ) : (
                                <>🚀 Import with AI</>
                            )}
                        </button>
                    </form>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">How it works</h3>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                background: 'var(--accent-gradient)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>1</div>
                            <div>
                                <strong>Paste or fetch content</strong>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Content is submitted to a background queue
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                background: 'var(--accent-gradient)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>2</div>
                            <div>
                                <strong>AI processing</strong>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    AI runs in the background (even if you close the tab)
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                background: 'var(--accent-gradient)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>3</div>
                            <div>
                                <strong>Track progress</strong>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    You'll be notified when the course is ready
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
                        <h4 style={{ marginBottom: '0.75rem' }}>Try this example:</h4>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setRawText(exampleText)}
                            style={{ width: '100%' }}
                        >
                            📋 Load Example Syllabus
                        </button>

                        {queueStatus && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.75rem',
                                background: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-sm)',
                                textAlign: 'center',
                                fontSize: '0.9rem',
                                color: 'var(--text-secondary)'
                            }}>
                                📊 Jobs waiting in queue: <strong>{queueStatus.messageCount}</strong>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}

export default ImportCourse;
