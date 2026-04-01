import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../lib/api';

const ClockIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const TennisIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M18 2c-4 4-4 12 0 16M6 22c4-4 4-12 0-16M2 12h20" />
    </svg>
);

const ListIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
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

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

function toValidDate(value) {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function formatDateTime(value) {
    const parsedDate = toValidDate(value);
    return parsedDate ? parsedDate.toLocaleString() : 'Unavailable';
}

function formatTimeOnly(value) {
    const parsedDate = toValidDate(value);
    return parsedDate ? parsedDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Unavailable';
}

function getReservationPhase(reservation, nowMs) {
    const startDate = toValidDate(reservation.start_time);
    const endDate = toValidDate(reservation.end_time);

    if (!startDate || !endDate) {
        return 'unknown';
    }

    if (nowMs < startDate.getTime()) {
        return 'scheduled';
    }

    if (nowMs >= endDate.getTime()) {
        return 'expired';
    }

    if (endDate.getTime() - nowMs < 15 * 60 * 1000) {
        return 'ending';
    }

    return 'active';
}

function getReservationTimer(reservation, nowMs) {
    const phase = getReservationPhase(reservation, nowMs);
    const startDate = toValidDate(reservation.start_time);
    const endDate = toValidDate(reservation.end_time);
    const targetDate = phase === 'scheduled' ? startDate : endDate;

    if (!targetDate) {
        return null;
    }

    const diff = Math.max(0, targetDate.getTime() - nowMs);

    return {
        phase,
        targetDate,
        total: diff,
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60)
    };
}

function formatCountdown(timer) {
    if (!timer || timer.total <= 0) {
        return '00:00:00';
    }

    if (timer.days > 0) {
        return `${timer.days}d ${String(timer.hours).padStart(2, '0')}h`;
    }

    return `${String(timer.hours).padStart(2, '0')}:${String(timer.minutes).padStart(2, '0')}:${String(timer.seconds).padStart(2, '0')}`;
}

function getStatusLabel(phase) {
    if (phase === 'scheduled') {
        return 'Scheduled';
    }

    if (phase === 'ending') {
        return 'Ending soon';
    }

    if (phase === 'active') {
        return 'Live now';
    }

    return 'Expired';
}

function getTimerLabel(phase) {
    if (phase === 'scheduled') {
        return 'Starts In';
    }

    if (phase === 'ending') {
        return 'Ends In';
    }

    return 'Time Remaining';
}

function MyReservations() {
    const [activeTab, setActiveTab] = useState('reservations');
    const [reservations, setReservations] = useState([]);
    const [waitlist, setWaitlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [nowMs, setNowMs] = useState(Date.now());
    const [showQRModal, setShowQRModal] = useState(false);
    const [selectedQR, setSelectedQR] = useState('');
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [cancelPasscode, setCancelPasscode] = useState('');
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const courtsResponse = await axios.get('/api/courts');
                const courts = courtsResponse.data;

                const courtData = await Promise.all(
                    courts.map(async (court) => {
                        try {
                            const [reservationsResponse, waitlistResponse] = await Promise.all([
                                axios.get(`/api/courts/${court.id}/reservations`),
                                axios.get(`/api/courts/${court.id}/waitlist`)
                            ]);

                            return {
                                reservations: reservationsResponse.data.map((reservation) => ({
                                    ...reservation,
                                    court_name: court.name,
                                    court_address: court.address
                                })),
                                waitlist: waitlistResponse.data.map((entry) => ({
                                    ...entry,
                                    court_name: court.name,
                                    court_address: court.address
                                }))
                            };
                        } catch (error) {
                            console.error(`Error fetching reservation data for ${court.id}:`, error);
                            return { reservations: [], waitlist: [] };
                        }
                    })
                );

                setReservations(courtData.flatMap((court) => court.reservations));
                setWaitlist(courtData.flatMap((court) => court.waitlist));
            } catch (error) {
                toast.error(getApiErrorMessage(error, 'Failed to load reservations'));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const showQRCode = (qrCode) => {
        setSelectedQR(qrCode);
        setShowQRModal(true);
    };

    const openCancelModal = (reservation) => {
        setSelectedReservation(reservation);
        setCancelPasscode('');
        setShowCancelModal(true);
    };

    const closeCancelModal = () => {
        setShowCancelModal(false);
        setSelectedReservation(null);
        setCancelPasscode('');
    };

    const cancelReservation = async (e) => {
        e.preventDefault();

        if (!selectedReservation) {
            return;
        }

        setCancelling(true);

        try {
            await axios.delete(`/api/reservations/${selectedReservation.id}`, {
                data: { passcode: cancelPasscode }
            });
            setReservations((current) => current.filter((reservation) => reservation.id !== selectedReservation.id));
            closeCancelModal();
            toast.success('Reservation cancelled');
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to cancel reservation'));
        } finally {
            setCancelling(false);
        }
    };

    const removeFromWaitlist = async (waitlistId) => {
        try {
            await axios.delete(`/api/waitlist/${waitlistId}`);
            setWaitlist((current) => current.filter((entry) => entry.id !== waitlistId));
            toast.success('Removed from waitlist');
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to remove from waitlist'));
        }
    };

    const reservationView = reservations
        .map((reservation) => {
            const timer = getReservationTimer(reservation, nowMs);
            return {
                ...reservation,
                phase: timer?.phase || 'unknown',
                timer
            };
        })
        .sort((left, right) => new Date(left.start_time) - new Date(right.start_time));

    const liveReservations = reservationView
        .filter((reservation) => reservation.phase === 'active' || reservation.phase === 'ending')
        .sort((left, right) => new Date(left.end_time) - new Date(right.end_time));

    const scheduledReservations = reservationView
        .filter((reservation) => reservation.phase === 'scheduled')
        .sort((left, right) => new Date(left.start_time) - new Date(right.start_time));

    const endingSoonCount = liveReservations.filter((reservation) => reservation.phase === 'ending').length;

    const renderReservationCard = (reservation) => (
        <article key={reservation.id} className={`reservation-card reservation-card-${reservation.phase}`}>
            <div className={`reservation-card-header ${reservation.phase}`}>
                <div>
                    <span className="status-chip">{getStatusLabel(reservation.phase)}</span>
                    <h3>{reservation.court_name}</h3>
                    <p>{reservation.court_address}</p>
                </div>
                <div className="reservation-timer">
                    <span>{getTimerLabel(reservation.phase)}</span>
                    <strong>{formatCountdown(reservation.timer)}</strong>
                    <small>{formatDateTime(reservation.timer?.targetDate)}</small>
                </div>
            </div>

            <div className="reservation-card-body">
                <div className="quick-fact-grid compact reservation-meta-grid">
                    <div className="quick-fact">
                        <span>Players</span>
                        <strong>{reservation.number_of_players}</strong>
                    </div>
                    <div className="quick-fact">
                        <span>Duration</span>
                        <strong>{reservation.duration_hours}h</strong>
                    </div>
                    <div className="quick-fact">
                        <span>Start</span>
                        <strong>{formatTimeOnly(reservation.start_time)}</strong>
                    </div>
                    <div className="quick-fact">
                        <span>End</span>
                        <strong>{formatTimeOnly(reservation.end_time)}</strong>
                    </div>
                </div>

                <div className="reservation-window-banner">
                    <CalendarIcon />
                    <div>
                        <span>Scheduled Window</span>
                        <strong>{formatDateTime(reservation.start_time)} to {formatDateTime(reservation.end_time)}</strong>
                    </div>
                </div>

                <div className="detail-card">
                    <div className="detail-row">
                        <span>Player</span>
                        <strong>{reservation.player_name}</strong>
                    </div>
                    <div className="detail-row">
                        <span>Reserved At</span>
                        <strong>{formatDateTime(reservation.created_at)}</strong>
                    </div>
                    <div className="detail-row">
                        <span>Cancellation</span>
                        <strong>{reservation.has_passcode ? 'Protected by passcode' : 'Online cancel unavailable'}</strong>
                    </div>
                </div>

                <div className="stack-actions reservation-actions-grid">
                    {reservation.qr_code && (
                        <button
                            className="btn btn-primary btn-full"
                            onClick={() => showQRCode(reservation.qr_code)}
                        >
                            <ClockIcon />
                            Show QR Confirmation
                        </button>
                    )}

                    <button
                        className="btn btn-outline btn-full"
                        onClick={() => openCancelModal(reservation)}
                        disabled={!reservation.has_passcode}
                    >
                        <CloseIcon />
                        {!reservation.has_passcode ? 'Online Cancel Unavailable' : reservation.phase === 'scheduled' ? 'Cancel Future Reservation' : 'Cancel Reservation'}
                    </button>
                </div>
            </div>
        </article>
    );

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading your reservations...</p>
            </div>
        );
    }

    return (
        <div className="page-stack fade-in">
            <section className="section-intro">
                <div>
                    <span className="section-kicker">Reservation Desk</span>
                    <h1>Track live play, future bookings, and waitlist pressure without broken countdowns</h1>
                    <p>
                        Future bookings are now split from live sessions so scheduled reservations read like a timeline, not like a timer glitch.
                    </p>
                </div>

                <div className="intro-metrics">
                    <div className="intro-metric">
                        <span>Live Now</span>
                        <strong>{liveReservations.length}</strong>
                    </div>
                    <div className="intro-metric">
                        <span>Scheduled</span>
                        <strong>{scheduledReservations.length}</strong>
                    </div>
                    <div className="intro-metric">
                        <span>Waitlist</span>
                        <strong>{waitlist.length}</strong>
                    </div>
                </div>
            </section>

            <div className="tabs-row">
                <button
                    className={`tab-button ${activeTab === 'reservations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reservations')}
                >
                    <TennisIcon />
                    Reservations
                    <span>{reservationView.length}</span>
                </button>
                <button
                    className={`tab-button ${activeTab === 'waitlist' ? 'active' : ''}`}
                    onClick={() => setActiveTab('waitlist')}
                >
                    <ListIcon />
                    Waitlist
                    <span>{waitlist.length}</span>
                </button>
            </div>

            {activeTab === 'reservations' && (
                <section className="section-block reservation-board">
                    {reservationView.length === 0 ? (
                        <div className="empty-state">
                            <TennisIcon />
                            <h3>No Reservations Yet</h3>
                            <p>Your scheduled and live court sessions will appear here once you create them.</p>
                        </div>
                    ) : (
                        <div className="reservation-stage-grid">
                            <div className="reservation-stage-card">
                                <div className="reservation-stage-header">
                                    <div>
                                        <span className="section-kicker">Live Now</span>
                                        <h2>Sessions currently on court</h2>
                                        <p>These cards count down to the actual end of play, with separate warning treatment for sessions about to expire.</p>
                                    </div>
                                    <div className="reservation-stage-count">{liveReservations.length}</div>
                                </div>

                                {liveReservations.length === 0 ? (
                                    <div className="reservation-stage-empty">
                                        <ClockIcon />
                                        <p>No live reservations right now.</p>
                                    </div>
                                ) : (
                                    <div className="reservation-grid">
                                        {liveReservations.map(renderReservationCard)}
                                    </div>
                                )}
                            </div>

                            <div className="reservation-stage-card">
                                <div className="reservation-stage-header">
                                    <div>
                                        <span className="section-kicker">Scheduled</span>
                                        <h2>Future bookings lined up</h2>
                                        <p>Upcoming reservations count down to the start time first, so a booking tomorrow no longer shows as thousands of running hours.</p>
                                    </div>
                                    <div className="reservation-stage-count accent">{scheduledReservations.length}</div>
                                </div>

                                <div className="reservation-stage-strip">
                                    <div className="reservation-stage-chip">
                                        <span>Ending Soon</span>
                                        <strong>{endingSoonCount}</strong>
                                    </div>
                                    <div className="reservation-stage-chip">
                                        <span>Next Start</span>
                                        <strong>{scheduledReservations[0] ? formatDateTime(scheduledReservations[0].start_time) : 'No future booking'}</strong>
                                    </div>
                                </div>

                                {scheduledReservations.length === 0 ? (
                                    <div className="reservation-stage-empty">
                                        <CalendarIcon />
                                        <p>No future reservations scheduled yet.</p>
                                    </div>
                                ) : (
                                    <div className="reservation-grid">
                                        {scheduledReservations.map(renderReservationCard)}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            )}

            {activeTab === 'waitlist' && (
                <section className="section-block">
                    {waitlist.length === 0 ? (
                        <div className="empty-state">
                            <ListIcon />
                            <h3>No Waitlist Entries</h3>
                            <p>You are not currently queued for any courts. Join a waitlist from the Courts page when a venue is busy.</p>
                        </div>
                    ) : (
                        <div className="reservation-grid">
                            {waitlist.map((entry) => (
                                <article key={entry.id} className="reservation-card waitlist-card">
                                    <div className="reservation-card-header neutral">
                                        <div>
                                            <span className="status-chip">Queued</span>
                                            <h3>{entry.court_name}</h3>
                                            <p>{entry.court_address}</p>
                                        </div>
                                        <div className="waitlist-position-chip">#{entry.position}</div>
                                    </div>

                                    <div className="reservation-card-body">
                                        <div className="quick-fact-grid compact">
                                            <div className="quick-fact">
                                                <span>Players</span>
                                                <strong>{entry.number_of_players}</strong>
                                            </div>
                                            <div className="quick-fact">
                                                <span>Duration</span>
                                                <strong>{entry.duration_hours}h</strong>
                                            </div>
                                            <div className="quick-fact">
                                                <span>Preferred Date</span>
                                                <strong>{entry.preferred_date || 'Flexible'}</strong>
                                            </div>
                                            <div className="quick-fact">
                                                <span>Preferred Time</span>
                                                <strong>{entry.preferred_time || 'Flexible'}</strong>
                                            </div>
                                        </div>

                                        <div className="detail-card">
                                            <div className="detail-row">
                                                <span>Player</span>
                                                <strong>{entry.player_name}</strong>
                                            </div>
                                            <div className="detail-row">
                                                <span>Joined</span>
                                                <strong>{formatDateTime(entry.created_at)}</strong>
                                            </div>
                                        </div>

                                        <button
                                            className="btn btn-outline btn-full"
                                            onClick={() => removeFromWaitlist(entry.id)}
                                        >
                                            <CloseIcon />
                                            Leave Waitlist
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {showQRModal && (
                <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Reservation QR Code</h2>
                            <button className="modal-close" onClick={() => setShowQRModal(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="qr-container">
                                <img src={selectedQR} alt="QR Code" />
                                <p className="qr-instruction">Show this code at the court to check in.</p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary btn-full" onClick={() => setShowQRModal(false)}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCancelModal && selectedReservation && (
                <div className="modal-overlay" onClick={closeCancelModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Cancel Reservation</h2>
                            <button className="modal-close" onClick={closeCancelModal}>
                                <CloseIcon />
                            </button>
                        </div>
                        <form onSubmit={cancelReservation}>
                            <div className="modal-body">
                                <div className="detail-card">
                                    <div className="detail-row">
                                        <span>Court</span>
                                        <strong>{selectedReservation.court_name}</strong>
                                    </div>
                                    <div className="detail-row">
                                        <span>Window</span>
                                        <strong>{formatDateTime(selectedReservation.start_time)} to {formatDateTime(selectedReservation.end_time)}</strong>
                                    </div>
                                    <div className="detail-row">
                                        <span>Player</span>
                                        <strong>{selectedReservation.player_name}</strong>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Passcode *</label>
                                    <input
                                        type="password"
                                        value={cancelPasscode}
                                        onChange={(e) => setCancelPasscode(e.target.value)}
                                        required
                                        placeholder="Enter reservation passcode"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeCancelModal} disabled={cancelling}>
                                    Keep Reservation
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={cancelling}>
                                    {cancelling ? 'Cancelling...' : 'Verify & Cancel'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyReservations;
