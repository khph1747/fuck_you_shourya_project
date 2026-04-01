import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import Courts from './pages/Courts';
import Map from './pages/Map';
import MyReservations from './pages/MyReservations';

const TennisIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M18 2c-4 4-4 12 0 16M6 22c4-4 4-12 0-16M2 12h20" />
    </svg>
);

const HomeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

const CourtIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="12" y1="3" x2="12" y2="21" />
        <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
);

const MapIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const CalendarIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const navigation = [
    { to: '/', label: 'Home', icon: <HomeIcon /> },
    { to: '/courts', label: 'Courts', icon: <CourtIcon /> },
    { to: '/map', label: 'Map', icon: <MapIcon /> },
    { to: '/reservations', label: 'Reservations', icon: <CalendarIcon /> }
];
const SITE_WATERMARK_TEXT = 'NO FUCKING CREDIT FOR FUCKING SHOURYA :))';

function Navbar() {
    return (
        <nav className="navbar">
            <div className="navbar-container">
                <div className="brand-cluster">
                    <Link to="/" className="navbar-brand">
                        <span className="brand-mark">
                            <TennisIcon />
                        </span>
                        <span className="brand-copy">
                            <strong>TennisBook</strong>
                            <span>Public court scheduling</span>
                        </span>
                    </Link>
                    <span className="navbar-tag">Milpitas</span>
                </div>

                <div className="navbar-links">
                    {navigation.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        >
                            {item.icon}
                            {item.label}
                        </NavLink>
                    ))}
                </div>

                <div className="navbar-status">
                    <span className="status-dot"></span>
                    Live OSM data
                </div>
            </div>
        </nav>
    );
}

function App() {
    return (
        <Router>
            <div className="app">
                <div className="global-watermark" aria-hidden="true">
                    <div className="global-watermark-track">
                        <span>{SITE_WATERMARK_TEXT}</span>
                        <span>{SITE_WATERMARK_TEXT}</span>
                        <span>{SITE_WATERMARK_TEXT}</span>
                        <span>{SITE_WATERMARK_TEXT}</span>
                        <span>{SITE_WATERMARK_TEXT}</span>
                    </div>
                </div>
                <div className="app-shell">
                    <Navbar />
                    <main className="main-content">
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/courts" element={<Courts />} />
                            <Route path="/map" element={<Map />} />
                            <Route path="/reservations" element={<MyReservations />} />
                        </Routes>
                    </main>
                    <footer className="app-footer">
                        <span>TennisBook</span>
                        <span>Milpitas public courts</span>
                        <span>Reservations, waitlist, live availability</span>
                    </footer>
                </div>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 3200,
                        style: {
                            background: '#17332d',
                            color: '#f7f6f1',
                            borderRadius: '18px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 18px 40px rgba(14, 36, 32, 0.26)'
                        },
                        success: {
                            iconTheme: {
                                primary: '#7fd7b2',
                                secondary: '#17332d'
                            }
                        },
                        error: {
                            iconTheme: {
                                primary: '#f97373',
                                secondary: '#17332d'
                            }
                        }
                    }}
                />
            </div>
        </Router>
    );
}

export default App;
