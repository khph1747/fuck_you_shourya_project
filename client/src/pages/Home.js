import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../lib/api';

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

const ClockIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const UsersIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const QRCodeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
    </svg>
);

const ShieldIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
    </svg>
);

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const ArrowIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

function Home() {
    const [stats, setStats] = useState({
        totalCourts: 0,
        availableNow: 0,
        totalReservations: 0,
        lightedCourts: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get('/api/courts');
                const courts = response.data;
                const totalCourts = courts.length;
                const availableNow = courts.filter((court) => court.active_reservations === 0).length;
                const totalReservations = courts.reduce((sum, court) => sum + court.active_reservations, 0);
                const lightedCourts = courts.filter((court) => court.lights === 1).length;
                setStats({ totalCourts, availableNow, totalReservations, lightedCourts });
            } catch (error) {
                console.error('Error fetching stats:', error);
                toast.error(getApiErrorMessage(error, 'Failed to load dashboard stats'));
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const featureCards = [
        {
            icon: <MapIcon />,
            title: 'Venue-aware court listings',
            description: 'Court names and addresses are pulled from OpenStreetMap and cleaned into a format people can actually recognize.'
        },
        {
            icon: <ClockIcon />,
            title: 'Operational availability',
            description: 'Players can see which courts are open now, which ones are busy, and where the current demand is concentrated.'
        },
        {
            icon: <UsersIcon />,
            title: 'Reservation and waitlist flow',
            description: 'Booking, cooldown protection, and waitlist management are designed to keep public access fair and transparent.'
        },
        {
            icon: <QRCodeIcon />,
            title: 'Check-in ready',
            description: 'Every booking produces a QR confirmation so the on-site handoff stays simple and professional.'
        }
    ];

    const workflow = [
        {
            step: '01',
            title: 'Discover courts',
            description: 'Search by school, park, or street address and filter by availability, lights, or environment.'
        },
        {
            step: '02',
            title: 'Reserve fast',
            description: 'Book a free public court in minutes with a lightweight reservation flow and instant confirmation.'
        },
        {
            step: '03',
            title: 'Manage demand',
            description: 'Track active bookings, view countdown timers, and move onto the waitlist when courts fill up.'
        }
    ];

    return (
        <div className="page-stack fade-in home-page">
            <section className="hero">
                <div className="hero-grid">
                    <div className="hero-content">
                        <div className="hero-badge hero-badge-strong">
                            <MapIcon />
                            <span>Operational public-court command layer</span>
                        </div>
                        <h1 className="hero-title">A sharper, faster reservation experience for public tennis courts in Milpitas.</h1>
                        <p className="hero-copy">
                            TennisBook now reads like a true booking product: real-time court discovery, map intelligence,
                            scheduled play windows, passcode-protected cancellation, and demand signals that stay readable under pressure.
                        </p>
                        <div className="hero-actions">
                            <Link to="/courts" className="btn btn-lg btn-primary">
                                <CourtIcon />
                                Explore Courts
                            </Link>
                            <Link to="/reservations" className="btn btn-lg btn-outline">
                                <UsersIcon />
                                Review Reservations
                            </Link>
                        </div>
                        <div className="hero-strip">
                            <div className="hero-strip-item">
                                <span>Signal</span>
                                <strong>Live availability + future occupancy</strong>
                            </div>
                            <div className="hero-strip-item">
                                <span>Flow</span>
                                <strong>Book, queue, cancel, and check in from one place</strong>
                            </div>
                            <div className="hero-strip-item">
                                <span>Design</span>
                                <strong>Upgraded UI with stronger hierarchy and scheduling clarity</strong>
                            </div>
                        </div>
                    </div>

                    <div className="hero-panel hero-panel-spotlight">
                        <div className="hero-panel-header">
                            <span className="section-kicker">Operational Snapshot</span>
                            <h2>Network readiness at a glance</h2>
                        </div>

                        <div className="hero-kpi-grid hero-kpi-grid-strong">
                            <div className="hero-kpi">
                                <span>Total Courts</span>
                                <strong>{loading ? '...' : stats.totalCourts}</strong>
                            </div>
                            <div className="hero-kpi">
                                <span>Available Now</span>
                                <strong>{loading ? '...' : stats.availableNow}</strong>
                            </div>
                            <div className="hero-kpi">
                                <span>Lighted Courts</span>
                                <strong>{loading ? '...' : stats.lightedCourts}</strong>
                            </div>
                            <div className="hero-kpi">
                                <span>Active Bookings</span>
                                <strong>{loading ? '...' : stats.totalReservations}</strong>
                            </div>
                        </div>

                        <div className="hero-list hero-signal-list">
                            <div className="hero-list-item">
                                <CheckIcon />
                                <span>Free public venues only</span>
                            </div>
                            <div className="hero-list-item">
                                <ShieldIcon />
                                <span>Cooldown rules protect shared access</span>
                            </div>
                            <div className="hero-list-item">
                                <ClockIcon />
                                <span>Built for same-day and future scheduling</span>
                            </div>
                            <div className="hero-callout">
                                <span>Current mode</span>
                                <strong>Editorial sports dashboard</strong>
                                <p>Less demo-site, more polished booking control room.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section-block home-section home-section-core">
                <div className="section-header">
                    <div>
                        <span className="section-kicker">Core Platform</span>
                        <h2 className="section-title">Refactored to feel deliberate, premium, and easier to scan under load</h2>
                    </div>
                    <p className="section-copy">
                        Every major interaction now pushes clearer hierarchy, stronger spacing, and more confident product framing.
                    </p>
                </div>

                <div className="feature-grid">
                    {featureCards.map((feature) => (
                        <article key={feature.title} className="feature-card">
                            <div className="feature-icon">{feature.icon}</div>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="section-block home-section home-section-process">
                <div className="section-header">
                    <div>
                        <span className="section-kicker">Workflow</span>
                        <h2 className="section-title">Three moves from availability scan to confirmed play window</h2>
                    </div>
                    <Link to="/map" className="section-link">
                        Open the map
                        <ArrowIcon />
                    </Link>
                </div>

                <div className="process-grid">
                    {workflow.map((item) => (
                        <article key={item.step} className="process-card">
                            <span className="process-step">{item.step}</span>
                            <h3>{item.title}</h3>
                            <p>{item.description}</p>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}

export default Home;
