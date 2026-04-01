import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import axios from 'axios';
import toast from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getApiErrorMessage } from '../lib/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const LocationIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const TennisIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M18 2c-4 4-4 12 0 16M6 22c4-4 4-12 0-16M2 12h20" />
    </svg>
);

const ArrowIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

function RecenterMap({ center }) {
    const map = useMap();

    useEffect(() => {
        if (center) {
            map.setView(center, 12);
        }
    }, [center, map]);

    return null;
}

function formatSurface(surface) {
    if (!surface) {
        return 'Hard';
    }

    return surface
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function Map() {
    const [courts, setCourts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState(null);
    const [mapCenter, setMapCenter] = useState([37.4323, -121.8996]);
    const [selectedCourt, setSelectedCourt] = useState(null);

    useEffect(() => {
        const fetchCourts = async () => {
            try {
                const response = await axios.get('/api/courts');
                setCourts(response.data);
            } catch (error) {
                toast.error(getApiErrorMessage(error, 'Failed to load courts'));
            } finally {
                setLoading(false);
            }
        };

        fetchCourts();
        getUserLocation();
    }, []);

    const getUserLocation = () => {
        if (!navigator.geolocation) {
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setUserLocation([latitude, longitude]);
                setMapCenter([latitude, longitude]);
            },
            (error) => {
                console.error('Error getting location:', error);
                toast.error('Could not get your location. Showing Milpitas instead.');
            }
        );
    };

    const availableCourts = courts.filter((court) => court.active_reservations === 0).length;
    const busyCourts = courts.length - availableCourts;
    const lightedCourts = courts.filter((court) => court.lights === 1).length;

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading map...</p>
            </div>
        );
    }

    return (
        <div className="page-stack fade-in">
            <section className="section-intro">
                <div>
                    <span className="section-kicker">Spatial View</span>
                    <h1>Map the entire Milpitas court network at a glance</h1>
                    <p>
                        Use the map to scan venue density, compare availability, and jump directly from location review into
                        reservation flow.
                    </p>
                </div>

                <div className="intro-metrics">
                    <div className="intro-metric">
                        <span>Available</span>
                        <strong>{availableCourts}</strong>
                    </div>
                    <div className="intro-metric">
                        <span>Busy</span>
                        <strong>{busyCourts}</strong>
                    </div>
                    <div className="intro-metric">
                        <span>Lights</span>
                        <strong>{lightedCourts}</strong>
                    </div>
                </div>
            </section>

            <section className="map-layout">
                <div className="map-panel">
                    <div className="map-header">
                        <div>
                            <span className="section-kicker">Interactive Map</span>
                            <h2>Availability by location</h2>
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={getUserLocation}>
                            <LocationIcon />
                            My Location
                        </button>
                    </div>

                    <div className="map-wrapper">
                        <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <RecenterMap center={mapCenter} />

                            {userLocation && (
                                <Marker position={userLocation}>
                                    <Popup>
                                        <div className="map-popup">
                                            <h3>Your Location</h3>
                                            <p>Centered using your device location.</p>
                                        </div>
                                    </Popup>
                                </Marker>
                            )}

                            {courts.map((court) => (
                                <Marker
                                    key={court.id}
                                    position={[court.latitude, court.longitude]}
                                    icon={court.active_reservations > 0 ? redIcon : greenIcon}
                                    eventHandlers={{
                                        click: () => setSelectedCourt(court)
                                    }}
                                >
                                    <Popup>
                                        <div className="map-popup">
                                            <h3>{court.name}</h3>
                                            <p>{court.address}</p>
                                            <div className="map-popup-meta">
                                                <span>{court.indoor ? 'Indoor' : 'Outdoor'}</span>
                                                <span>{court.active_reservations} reserved</span>
                                                <span>{court.waitlist_count} waitlist</span>
                                            </div>
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${court.latitude},${court.longitude}`)}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="map-popup-link"
                                            >
                                                Directions
                                            </a>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                </div>

                <aside className="map-sidebar">
                    <div className="legend-card">
                        <span className="section-kicker">Legend</span>
                        <h3>Marker meaning</h3>
                        <div className="legend-list">
                            <div className="legend-item">
                                <span className="legend-swatch available"></span>
                                Available court
                            </div>
                            <div className="legend-item">
                                <span className="legend-swatch busy"></span>
                                Court with active reservations
                            </div>
                            <div className="legend-item">
                                <span className="legend-swatch location"></span>
                                Your location
                            </div>
                        </div>
                    </div>

                    {selectedCourt ? (
                        <div className="selected-court-panel">
                            <span className="section-kicker">Selected Court</span>
                            <h3>{selectedCourt.name}</h3>
                            <p>{selectedCourt.address}</p>

                            <div className="quick-fact-grid">
                                <div className="quick-fact">
                                    <span>Surface</span>
                                    <strong>{formatSurface(selectedCourt.surface_type)}</strong>
                                </div>
                                <div className="quick-fact">
                                    <span>Environment</span>
                                    <strong>{selectedCourt.indoor ? 'Indoor' : 'Outdoor'}</strong>
                                </div>
                                <div className="quick-fact">
                                    <span>Reserved</span>
                                    <strong>{selectedCourt.active_reservations}</strong>
                                </div>
                                <div className="quick-fact">
                                    <span>Waitlist</span>
                                    <strong>{selectedCourt.waitlist_count}</strong>
                                </div>
                            </div>

                            <div className="stack-actions">
                                <Link to="/courts" className="btn btn-primary btn-full">
                                    <TennisIcon />
                                    Reserve This Court
                                </Link>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedCourt.latitude},${selectedCourt.longitude}`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-outline btn-full"
                                >
                                    <ArrowIcon />
                                    Open Directions
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="selected-court-panel empty">
                            <span className="section-kicker">Context Panel</span>
                            <h3>Select a marker</h3>
                            <p>Click any court pin to view details, demand signals, and a direct path into reservations.</p>
                        </div>
                    )}
                </aside>
            </section>
        </div>
    );
}

export default Map;
