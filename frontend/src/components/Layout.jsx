import { Link, Outlet, useLocation } from 'react-router-dom';

function Layout() {
    const location = useLocation();

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="logo-icon">📚</div>
                    <span className="logo-text">Study Planner</span>
                </div>

                <nav className="sidebar-nav">
                    <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                        <span className="nav-icon">🏠</span>
                        Dashboard
                    </Link>
                    <Link to="/courses" className={`nav-link ${isActive('/courses') ? 'active' : ''}`}>
                        <span className="nav-icon">📖</span>
                        Courses
                    </Link>
                    <Link to="/import" className={`nav-link ${isActive('/import') ? 'active' : ''}`}>
                        <span className="nav-icon">🤖</span>
                        AI Import
                    </Link>
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Powered by Ollama AI
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;
