import { useState } from 'react';
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
            const response = await fetch(`${API_URL}/courses/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rawText, platform, courseCode })
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(`Course "${data.data.title}" imported successfully! ${data.data.modules?.length || 0} modules found.`);
                setRawText('');
                setPlatform('');
                setCourseCode('');
                setCourseUrl('');

                setTimeout(() => navigate('/courses'), 2000);
            } else {
                setError(data.error || 'Import failed');
            }
        } catch (err) {
            setError('AI parsing failed: ' + err.message);
        } finally {
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

            {success && (
                <div className="alert alert-success">
                    <span>✅</span> {success}
                </div>
            )}

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
                                <>
                                    <div className="spinner" style={{ width: '16px', height: '16px', margin: 0 }}></div>
                                    Processing with AI...
                                </>
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
                                    Paste course outline or enter URL to auto-fetch
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
                                <strong>AI extracts structure</strong>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    AI identifies modules, lessons, and durations
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
                                <strong>Create your plan</strong>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Set daily goals and track your progress
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
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ImportCourse;
