import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../lib/api';

const LocationIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const TennisBallIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M18 2c-4 4-4 12 0 16M6 22c4-4 4-12 0-16" />
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

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const WarningIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const RefreshIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 4v6h-6" />
        <path d="M1 20v-6h6" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
);

const SunIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
);

const SearchIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
    </svg>
);

const DirectionsIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 3l-9 18-2-8-8-2 18-8z" />
    </svg>
);

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const DEFAULT_FILTERS = {
    availableOnly: false,
    lightsOnly: false,
    environment: 'all'
};

const MAX_BOOKING_WINDOW_DAYS = 30;
const SLOT_INTERVAL_MINUTES = 30;
const SLOT_START_HOUR = 6;
const SLOT_END_HOUR = 22;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_GROUPS = [
    { label: 'Morning', start: 6 * 60, end: 11 * 60 + 30 },
    { label: 'Afternoon', start: 12 * 60, end: 16 * 60 + 30 },
    { label: 'Evening', start: 17 * 60, end: 22 * 60 }
];

function formatSurface(surface) {
    if (!surface) {
        return 'Hard';
    }

    return surface
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function getDirectionsUrl(court) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${court.latitude},${court.longitude}`)}`;
}

function getSlotMinutesList() {
    const slotMinutes = [];

    for (let currentMinutes = SLOT_START_HOUR * 60; currentMinutes <= SLOT_END_HOUR * 60; currentMinutes += SLOT_INTERVAL_MINUTES) {
        slotMinutes.push(currentMinutes);
    }

    return slotMinutes;
}

const SLOT_MINUTES_LIST = getSlotMinutesList();

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date, days) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
}

function getBookingWindow(referenceDate = new Date()) {
    const minDate = new Date(referenceDate);
    minDate.setHours(0, 0, 0, 0);

    const maxDate = addDays(minDate, MAX_BOOKING_WINDOW_DAYS);
    maxDate.setHours(23, 59, 59, 999);

    return { minDate, maxDate };
}

function getRoundedFutureDate(baseDate, offsetMinutes = 30) {
    const nextDate = new Date(baseDate);
    nextDate.setSeconds(0, 0);
    nextDate.setMinutes(nextDate.getMinutes() + offsetMinutes);

    const minuteRemainder = nextDate.getMinutes() % SLOT_INTERVAL_MINUTES;

    if (minuteRemainder !== 0) {
        nextDate.setMinutes(nextDate.getMinutes() + (SLOT_INTERVAL_MINUTES - minuteRemainder));
    }

    return nextDate;
}

function getPresetReservationSelection(preset) {
    const now = new Date();
    const nextDate = getRoundedFutureDate(now);

    if (preset === 'asap') {
        return {
            dateKey: getDateKey(nextDate),
            minutes: nextDate.getHours() * 60 + nextDate.getMinutes()
        };
    }

    if (preset === 'plus2') {
        const futureDate = getRoundedFutureDate(now, 120);
        return {
            dateKey: getDateKey(futureDate),
            minutes: futureDate.getHours() * 60 + futureDate.getMinutes()
        };
    }

    if (preset === 'tomorrow-morning') {
        const futureDate = addDays(now, 1);
        futureDate.setHours(7, 0, 0, 0);
        return {
            dateKey: getDateKey(futureDate),
            minutes: 7 * 60
        };
    }

    const futureDate = addDays(now, 1);
    futureDate.setHours(18, 0, 0, 0);
    return {
        dateKey: getDateKey(futureDate),
        minutes: 18 * 60
    };
}

function buildSlotDate(dateKey, minutes) {
    const slotDate = parseDateKey(dateKey);
    slotDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return slotDate;
}

function formatScheduleDateTime(value) {
    const parsedDate = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        return 'Choose a valid slot';
    }

    return parsedDate.toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function formatMonthLabel(date) {
    return date.toLocaleString([], {
        month: 'long',
        year: 'numeric'
    });
}

function formatShortDateLabel(dateKey) {
    const parsedDate = parseDateKey(dateKey);
    return parsedDate.toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

function formatSlotLabel(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const slotDate = new Date();
    slotDate.setHours(hours, mins, 0, 0);

    return slotDate.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
    });
}

function getSlotStatus(dateKey, minutes, durationHours, reservations, now, maxDate) {
    const slotStart = buildSlotDate(dateKey, minutes);
    const slotEnd = new Date(slotStart.getTime() + durationHours * 60 * 60 * 1000);

    if (slotStart.getTime() < now.getTime()) {
        return 'past';
    }

    if (slotStart.getTime() > maxDate.getTime()) {
        return 'out-of-range';
    }

    const hasConflict = reservations.some((reservation) => {
        const reservationStart = new Date(reservation.start_time);
        const reservationEnd = new Date(reservation.end_time);
        return slotStart < reservationEnd && slotEnd > reservationStart;
    });

    return hasConflict ? 'booked' : 'available';
}

function getDateAvailability(dateKey, durationHours, reservations, now, minDate, maxDate) {
    const currentDate = parseDateKey(dateKey);

    if (currentDate.getTime() < minDate.getTime() || currentDate.getTime() > maxDate.getTime()) {
        return {
            isDisabled: true,
            availableSlots: 0,
            bookedSlots: 0
        };
    }

    const statusList = SLOT_MINUTES_LIST.map((minutes) =>
        getSlotStatus(dateKey, minutes, durationHours, reservations, now, maxDate)
    );

    return {
        isDisabled: statusList.every((status) => status !== 'available'),
        availableSlots: statusList.filter((status) => status === 'available').length,
        bookedSlots: statusList.filter((status) => status === 'booked').length
    };
}

function buildCalendarDays(monthCursor, durationHours, reservations, now, minDate, maxDate) {
    const monthStart = startOfMonth(monthCursor);
    const gridStart = addDays(monthStart, -monthStart.getDay());

    return Array.from({ length: 42 }, (_, index) => {
        const currentDate = addDays(gridStart, index);
        const dateKey = getDateKey(currentDate);
        const availability = getDateAvailability(dateKey, durationHours, reservations, now, minDate, maxDate);

        return {
            date: currentDate,
            dateKey,
            isCurrentMonth: currentDate.getMonth() === monthCursor.getMonth(),
            isToday: dateKey === getDateKey(now),
            ...availability
        };
    });
}

function findFirstAvailableSlot(dateKey, durationHours, reservations, now, maxDate, preferredMinutes = null) {
    const orderedSlots = preferredMinutes === null
        ? SLOT_MINUTES_LIST
        : [preferredMinutes, ...SLOT_MINUTES_LIST.filter((minutes) => minutes !== preferredMinutes)];

    return orderedSlots.find((minutes) =>
        getSlotStatus(dateKey, minutes, durationHours, reservations, now, maxDate) === 'available'
    ) ?? null;
}

function findNextAvailableSelection(durationHours, reservations, now, minDate, maxDate, preferredDateKey = null, preferredMinutes = null) {
    const startDate = preferredDateKey
        ? parseDateKey(preferredDateKey)
        : new Date(minDate);

    startDate.setHours(0, 0, 0, 0);

    for (let currentDate = new Date(startDate); currentDate.getTime() <= maxDate.getTime(); currentDate = addDays(currentDate, 1)) {
        const dateKey = getDateKey(currentDate);
        const availableSlot = findFirstAvailableSlot(
            dateKey,
            durationHours,
            reservations,
            now,
            maxDate,
            dateKey === preferredDateKey ? preferredMinutes : null
        );

        if (availableSlot !== null) {
            return {
                dateKey,
                minutes: availableSlot
            };
        }
    }

    return null;
}

function Courts() {
    const [courts, setCourts] = useState([]);
    const [filteredCourts, setFilteredCourts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [sortBy, setSortBy] = useState('name');
    const [selectedCourt, setSelectedCourt] = useState(null);
    const [showReservationModal, setShowReservationModal] = useState(false);
    const [showWaitlistModal, setShowWaitlistModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [reservationDetails, setReservationDetails] = useState(null);
    const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
    const [selectedDateKey, setSelectedDateKey] = useState(getDateKey(new Date()));
    const [selectedTimeMinutes, setSelectedTimeMinutes] = useState(null);
    const [courtReservations, setCourtReservations] = useState([]);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [bookingTick, setBookingTick] = useState(Date.now());
    const [formData, setFormData] = useState({
        player_name: '',
        player_email: '',
        player_phone: '',
        passcode: '',
        start_time: '',
        number_of_players: 2,
        duration_hours: 1
    });
    const [waitlistData, setWaitlistData] = useState({
        player_name: '',
        player_email: '',
        player_phone: '',
        number_of_players: 2,
        preferred_date: '',
        preferred_time: '',
        duration_hours: 1
    });
    const [cooldownInfo, setCooldownInfo] = useState(null);
    const bookingNow = new Date(bookingTick);
    const { minDate: minBookableDate, maxDate: maxBookableDate } = getBookingWindow(bookingNow);
    const minBookableTime = minBookableDate.getTime();
    const maxBookableTime = maxBookableDate.getTime();

    useEffect(() => {
        fetchCourts();
    }, []);

    useEffect(() => {
        if (!showReservationModal || !selectedCourt) {
            return undefined;
        }

        let isActive = true;

        const fetchCourtReservations = async () => {
            setAvailabilityLoading(true);

            try {
                const response = await axios.get(`/api/courts/${selectedCourt.id}/reservations`);

                if (!isActive) {
                    return;
                }

                setCourtReservations(response.data);
            } catch (error) {
                if (isActive) {
                    setCourtReservations([]);
                    toast.error(getApiErrorMessage(error, 'Failed to load booking availability'));
                }
            } finally {
                if (isActive) {
                    setAvailabilityLoading(false);
                }
            }
        };

        fetchCourtReservations();

        return () => {
            isActive = false;
        };
    }, [showReservationModal, selectedCourt]);

    useEffect(() => {
        if (!showReservationModal) {
            return undefined;
        }

        const interval = setInterval(() => setBookingTick(Date.now()), 60000);

        return () => clearInterval(interval);
    }, [showReservationModal]);

    useEffect(() => {
        if (!showReservationModal) {
            return;
        }

        const bookingReference = new Date(bookingTick);
        const minBookableReference = new Date(minBookableTime);
        const maxBookableReference = new Date(maxBookableTime);
        const selectedDateAvailability = selectedDateKey
            ? getDateAvailability(
                selectedDateKey,
                Number(formData.duration_hours),
                courtReservations,
                bookingReference,
                minBookableReference,
                maxBookableReference
            )
            : null;
        const selectedSlotStatus = selectedDateKey && selectedTimeMinutes !== null
            ? getSlotStatus(
                selectedDateKey,
                selectedTimeMinutes,
                Number(formData.duration_hours),
                courtReservations,
                bookingReference,
                maxBookableReference
            )
            : null;

        if (selectedSlotStatus === 'available') {
            return;
        }

        if (selectedDateKey && selectedDateAvailability && !selectedDateAvailability.isDisabled) {
            const nextAvailableTime = findFirstAvailableSlot(
                selectedDateKey,
                Number(formData.duration_hours),
                courtReservations,
                bookingReference,
                maxBookableReference,
                selectedTimeMinutes
            );

            if (nextAvailableTime !== null) {
                if (selectedTimeMinutes !== nextAvailableTime) {
                    setSelectedTimeMinutes(nextAvailableTime);
                }
                return;
            }
        }

        const nextSelection = findNextAvailableSelection(
            Number(formData.duration_hours),
            courtReservations,
            bookingReference,
            minBookableReference,
            maxBookableReference,
            selectedDateKey,
            selectedTimeMinutes
        );

        if (!nextSelection) {
            setSelectedTimeMinutes(null);
            setFormData((current) => (current.start_time ? { ...current, start_time: '' } : current));
            return;
        }

        if (selectedDateKey !== nextSelection.dateKey) {
            setSelectedDateKey(nextSelection.dateKey);
        }

        if (selectedTimeMinutes !== nextSelection.minutes) {
            setSelectedTimeMinutes(nextSelection.minutes);
        }

        const nextMonth = startOfMonth(parseDateKey(nextSelection.dateKey));
        setCalendarMonth((currentMonth) => (
            currentMonth.getTime() === nextMonth.getTime() ? currentMonth : nextMonth
        ));
    }, [showReservationModal, courtReservations, formData.duration_hours, bookingTick, minBookableTime, maxBookableTime, selectedDateKey, selectedTimeMinutes]);

    useEffect(() => {
        if (!showReservationModal) {
            return;
        }

        const nextStartTime = selectedDateKey && selectedTimeMinutes !== null
            ? buildSlotDate(selectedDateKey, selectedTimeMinutes).toISOString()
            : '';

        setFormData((current) => (current.start_time === nextStartTime ? current : { ...current, start_time: nextStartTime }));
    }, [showReservationModal, selectedDateKey, selectedTimeMinutes]);

    useEffect(() => {
        let nextCourts = [...courts];
        const normalizedSearch = searchTerm.trim().toLowerCase();

        if (normalizedSearch) {
            nextCourts = nextCourts.filter((court) =>
                court.name.toLowerCase().includes(normalizedSearch) ||
                court.address.toLowerCase().includes(normalizedSearch)
            );
        }

        if (filters.availableOnly) {
            nextCourts = nextCourts.filter((court) => (court.active_reservations || 0) === 0);
        }

        if (filters.lightsOnly) {
            nextCourts = nextCourts.filter((court) => court.lights === 1);
        }

        if (filters.environment === 'indoor') {
            nextCourts = nextCourts.filter((court) => court.indoor === 1);
        }

        if (filters.environment === 'outdoor') {
            nextCourts = nextCourts.filter((court) => court.indoor !== 1);
        }

        nextCourts.sort((left, right) => {
            if (sortBy === 'available') {
                return (
                    (left.active_reservations || 0) - (right.active_reservations || 0) ||
                    (left.waitlist_count || 0) - (right.waitlist_count || 0) ||
                    left.name.localeCompare(right.name)
                );
            }

            if (sortBy === 'waitlist') {
                return (
                    (right.waitlist_count || 0) - (left.waitlist_count || 0) ||
                    (right.active_reservations || 0) - (left.active_reservations || 0) ||
                    left.name.localeCompare(right.name)
                );
            }

            if (sortBy === 'surface') {
                return (
                    formatSurface(left.surface_type).localeCompare(formatSurface(right.surface_type)) ||
                    left.name.localeCompare(right.name)
                );
            }

            return left.name.localeCompare(right.name);
        });

        setFilteredCourts(nextCourts);
    }, [courts, searchTerm, filters, sortBy]);

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

    const handleRefreshCourts = async () => {
        setRefreshing(true);
        try {
            const response = await axios.post('/api/courts/refresh', {
                latitude: 37.4323,
                longitude: -121.8996,
                radius: 5000
            });
            await fetchCourts();
            toast.success(
                response.data?.updated
                    ? `Synced ${response.data.total} courts and updated ${response.data.updated} names`
                    : 'Courts refreshed from OpenStreetMap!'
            );
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to refresh courts'));
        } finally {
            setRefreshing(false);
        }
    };

    const checkCooldown = async (email) => {
        if (!email || !selectedCourt) {
            return;
        }

        try {
            const response = await axios.get(`/api/cooldown/${selectedCourt.id}/${email}`);
            setCooldownInfo(response.data);
        } catch (error) {
            console.error('Error checking cooldown:', error);
            toast.error(getApiErrorMessage(error, 'Failed to check cooldown'));
        }
    };

    const handleReserve = (court) => {
        setSelectedCourt(court);
        setFormData({
            player_name: '',
            player_email: '',
            player_phone: '',
            passcode: '',
            start_time: '',
            number_of_players: 2,
            duration_hours: 1
        });
        setBookingTick(Date.now());
        setCalendarMonth(startOfMonth(new Date()));
        setSelectedDateKey(getDateKey(new Date()));
        setSelectedTimeMinutes(null);
        setCourtReservations([]);
        setReservationDetails(null);
        setCooldownInfo(null);
        setShowReservationModal(true);
    };

    const handleJoinWaitlist = (court) => {
        setSelectedCourt(court);
        setWaitlistData({
            player_name: '',
            player_email: '',
            player_phone: '',
            number_of_players: 2,
            preferred_date: '',
            preferred_time: '',
            duration_hours: 1
        });
        setShowWaitlistModal(true);
    };

    const handleChangeReservationDuration = (durationValue) => {
        setFormData((current) => ({
            ...current,
            duration_hours: durationValue
        }));
    };

    const handleSchedulePreset = (preset) => {
        const presetSelection = getPresetReservationSelection(preset);
        const matchingSlot = findFirstAvailableSlot(
            presetSelection.dateKey,
            Number(formData.duration_hours),
            courtReservations,
            bookingNow,
            maxBookableDate,
            presetSelection.minutes
        );

        if (matchingSlot === null) {
            toast.error('Preset slot is unavailable. Choose another date or time.');
            return;
        }

        setSelectedDateKey(presetSelection.dateKey);
        setSelectedTimeMinutes(matchingSlot);
        setCalendarMonth(startOfMonth(parseDateKey(presetSelection.dateKey)));
    };

    const handleCalendarDaySelect = (day) => {
        if (day.date.getTime() < minBookableDate.getTime()) {
            toast.error('This date is unavailable. Choose another day in the booking window.');
            return;
        }

        if (day.date.getTime() > maxBookableDate.getTime()) {
            toast.error(`Booking is limited to the next ${MAX_BOOKING_WINDOW_DAYS} days.`);
            return;
        }

        if (day.isDisabled) {
            toast.error('No valid slots remain on this date. Choose another day.');
            return;
        }

        const firstAvailableSlot = findFirstAvailableSlot(
            day.dateKey,
            Number(formData.duration_hours),
            courtReservations,
            bookingNow,
            maxBookableDate,
            day.dateKey === selectedDateKey ? selectedTimeMinutes : null
        );

        if (firstAvailableSlot === null) {
            toast.error('No valid slots remain on this date. Choose another day.');
            return;
        }

        setSelectedDateKey(day.dateKey);
        setSelectedTimeMinutes(firstAvailableSlot);

        const nextMonth = startOfMonth(day.date);
        if (calendarMonth.getTime() !== nextMonth.getTime()) {
            setCalendarMonth(nextMonth);
        }
    };

    const handleTimeSlotSelect = (minutes, status) => {
        if (status === 'booked') {
            toast.error('This time has already been booked. Choose another slot.');
            return;
        }

        if (status !== 'available') {
            toast.error('This time is unavailable. Choose another time or day.');
            return;
        }

        setSelectedTimeMinutes(minutes);
    };

    const submitReservation = async (e) => {
        e.preventDefault();
        if (!selectedCourt) {
            return;
        }

        if (!formData.start_time || selectedTimeMinutes === null) {
            toast.error('Choose an available date and time');
            return;
        }

        try {
            const response = await axios.post('/api/reservations', {
                court_id: selectedCourt.id,
                ...formData
            });
            setReservationDetails(response.data);
            setShowReservationModal(false);
            setShowQRModal(true);
            toast.success(`Reservation locked for ${formatScheduleDateTime(response.data.start_time)}`);
            await fetchCourts();
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to create reservation'));
        }
    };

    const submitWaitlist = async (e) => {
        e.preventDefault();
        if (!selectedCourt) {
            return;
        }

        try {
            const response = await axios.post('/api/waitlist', {
                court_id: selectedCourt.id,
                ...waitlistData
            });
            setShowWaitlistModal(false);
            toast.success(`Added to waitlist! Position: #${response.data.position}`);
            fetchCourts();
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to join waitlist'));
        }
    };

    const resetFilters = () => {
        setSearchTerm('');
        setFilters(DEFAULT_FILTERS);
        setSortBy('name');
    };

    const totalAvailable = courts.filter((court) => (court.active_reservations || 0) === 0).length;
    const scheduledLaterCount = courts.filter((court) => (court.upcoming_reservations || 0) > 0).length;
    const lightedCourts = courts.filter((court) => court.lights === 1).length;
    const busyCourts = courts.filter((court) => (court.active_reservations || 0) > 0).length;
    const hasActiveFilters =
        Boolean(searchTerm) ||
        filters.availableOnly ||
        filters.lightsOnly ||
        filters.environment !== 'all' ||
        sortBy !== 'name';
    const calendarDays = buildCalendarDays(
        calendarMonth,
        Number(formData.duration_hours),
        courtReservations,
        bookingNow,
        minBookableDate,
        maxBookableDate
    );
    const schedulePreviewStart = formData.start_time ? new Date(formData.start_time) : null;
    const schedulePreviewEnd = schedulePreviewStart && !Number.isNaN(schedulePreviewStart.getTime())
        ? new Date(schedulePreviewStart.getTime() + Number(formData.duration_hours) * 60 * 60 * 1000)
        : null;
    const schedulePresets = [
        { label: 'ASAP', preset: 'asap' },
        { label: '+2 Hours', preset: 'plus2' },
        { label: 'Tomorrow 7 AM', preset: 'tomorrow-morning' },
        { label: 'Tomorrow 6 PM', preset: 'tomorrow-evening' }
    ];
    const selectedDateAvailability = getDateAvailability(
        selectedDateKey,
        Number(formData.duration_hours),
        courtReservations,
        bookingNow,
        minBookableDate,
        maxBookableDate
    );
    const selectedTimeGroups = TIME_GROUPS.map((group) => ({
        ...group,
        slots: SLOT_MINUTES_LIST.filter((minutes) => minutes >= group.start && minutes <= group.end)
    }));
    const maxCalendarMonth = startOfMonth(maxBookableDate);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading Milpitas tennis courts...</p>
            </div>
        );
    }

    return (
        <div className="page-stack fade-in">
            <section className="section-intro">
                <div>
                    <span className="section-kicker">Court Directory</span>
                    <h1>Milpitas tennis courts with cleaner naming, better filters, and faster next actions</h1>
                    <p>Search by venue, compare current demand, then reserve, waitlist, or open directions from the same workspace.</p>
                </div>
                <div className="page-header-actions intro-actions">
                    <div className="search-box">
                        <SearchIcon />
                        <input
                            type="text"
                            placeholder="Search courts, parks, schools..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        className={`btn btn-secondary refresh-btn ${refreshing ? 'loading' : ''}`}
                        onClick={handleRefreshCourts}
                        disabled={refreshing}
                    >
                        <RefreshIcon />
                        {refreshing ? 'Syncing OSM...' : 'Sync OSM'}
                    </button>
                </div>
            </section>

            <section className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon green">
                        <TennisBallIcon />
                    </div>
                    <div className="stat-info">
                        <h3>{courts.length}</h3>
                        <p>Total Courts</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue">
                        <CheckIcon />
                    </div>
                    <div className="stat-info">
                        <h3>{totalAvailable}</h3>
                        <p>Available Now</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue">
                        <ClockIcon />
                    </div>
                    <div className="stat-info">
                        <h3>{scheduledLaterCount}</h3>
                        <p>Booked Later</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon amber">
                        <SunIcon />
                    </div>
                    <div className="stat-info">
                        <h3>{lightedCourts}</h3>
                        <p>Lighted Courts</p>
                    </div>
                </div>
            </section>

            <div className="courts-toolbar">
                <div className="filter-pills">
                    <button
                        className={`filter-pill ${filters.availableOnly ? 'active' : ''}`}
                        onClick={() => setFilters((current) => ({ ...current, availableOnly: !current.availableOnly }))}
                    >
                        Available now
                    </button>
                    <button
                        className={`filter-pill ${filters.lightsOnly ? 'active' : ''}`}
                        onClick={() => setFilters((current) => ({ ...current, lightsOnly: !current.lightsOnly }))}
                    >
                        Lights
                    </button>
                </div>

                <div className="toolbar-controls">
                    <select
                        value={filters.environment}
                        onChange={(e) => setFilters((current) => ({ ...current, environment: e.target.value }))}
                    >
                        <option value="all">All courts</option>
                        <option value="outdoor">Outdoor only</option>
                        <option value="indoor">Indoor only</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="name">Sort: Name</option>
                        <option value="available">Sort: Availability</option>
                        <option value="waitlist">Sort: Waitlist</option>
                        <option value="surface">Sort: Surface</option>
                    </select>

                    {hasActiveFilters && (
                        <button className="btn btn-outline btn-sm" onClick={resetFilters}>
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {filteredCourts.length === 0 ? (
                <div className="empty-state">
                    <TennisBallIcon />
                    <h3>No Courts Found</h3>
                    <p>
                        {hasActiveFilters
                            ? 'Try clearing your search or filters to see more courts.'
                            : 'Click "Sync OSM" to fetch tennis courts from OpenStreetMap.'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="results-count">
                        Showing {filteredCourts.length} of {courts.length} courts in Milpitas. {busyCourts} busy right now, {scheduledLaterCount} booked later today or beyond.
                    </div>
                    <div className="court-grid">
                        {filteredCourts.map((court) => {
                            const isAvailable = (court.active_reservations || 0) === 0;
                            const hasUpcomingReservations = (court.upcoming_reservations || 0) > 0;

                            return (
                                <div key={court.id} className="court-card">
                                    <div className="court-header">
                                        <div className="court-topline">
                                            <span className={`court-status-pill ${isAvailable ? 'badge-available' : 'badge-busy'}`}>
                                                {isAvailable ? 'Available now' : 'Busy now'}
                                            </span>
                                            {hasUpcomingReservations && (
                                                <span className="court-inline-meta">
                                                    Next booking {formatScheduleDateTime(court.next_reservation_start)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="court-heading">
                                            <h3 className="court-name">{court.name}</h3>
                                            <div className="court-address">
                                                <LocationIcon />
                                                {court.address}
                                            </div>
                                        </div>
                                        <div className="court-badge-row">
                                            <span className="badge badge-free">Free Public</span>
                                            <span className={`badge ${court.indoor ? 'badge-indoor' : 'badge-outdoor'}`}>
                                                {court.indoor ? 'Indoor' : 'Outdoor'}
                                            </span>
                                            {hasUpcomingReservations && (
                                                <span className="badge badge-scheduled">
                                                    Booked later
                                                </span>
                                            )}
                                            {court.lights === 1 && (
                                                <span className="badge badge-lights">
                                                    <SunIcon />
                                                    Lights
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="court-body">
                                        <div className="court-info">
                                            <div className="court-info-item">
                                                <TennisBallIcon />
                                                <span>{formatSurface(court.surface_type)} surface</span>
                                            </div>
                                            <div className="court-info-item">
                                                <ClockIcon />
                                                <span>{court.opening_hours === '24/7' ? 'Public • Open 24/7' : court.opening_hours}</span>
                                            </div>
                                        </div>
                                        <div className="court-stats">
                                            <div className="stat">
                                                <div className="stat-value">{court.active_reservations || 0}</div>
                                                <div className="stat-label">Live Now</div>
                                            </div>
                                            <div className="stat">
                                                <div className="stat-value">{court.upcoming_reservations || 0}</div>
                                                <div className="stat-label">Booked Later</div>
                                            </div>
                                            <div className="stat">
                                                <div className="stat-value">{court.waitlist_count || 0}</div>
                                                <div className="stat-label">Waitlist</div>
                                            </div>
                                        </div>
                                        {hasUpcomingReservations && (
                                            <div className="schedule-note">
                                                <span>Next scheduled booking</span>
                                                <strong>{formatScheduleDateTime(court.next_reservation_start)}</strong>
                                            </div>
                                        )}
                                        <div className="court-actions">
                                            <button
                                                className="btn btn-primary btn-full"
                                                onClick={() => handleReserve(court)}
                                            >
                                                Reserve Court
                                            </button>
                                        </div>
                                        <div className="court-utility-actions">
                                            <button
                                                className="btn btn-secondary btn-full"
                                                onClick={() => handleJoinWaitlist(court)}
                                            >
                                                <UsersIcon />
                                                Join Waitlist
                                            </button>
                                            <a
                                                className="btn btn-secondary btn-full"
                                                href={getDirectionsUrl(court)}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <DirectionsIcon />
                                                Directions
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {showReservationModal && selectedCourt && (
                <div className="modal-overlay" onClick={() => setShowReservationModal(false)}>
                    <div className="modal modal-booking" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Reserve {selectedCourt.name}</h2>
                            <button className="modal-close" onClick={() => setShowReservationModal(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <form onSubmit={submitReservation}>
                            <div className="modal-body">
                                <div className="booking-intro-card">
                                    <div>
                                        <span className="section-kicker">Schedule Builder</span>
                                        <h3>{selectedCourt.name}</h3>
                                        <p>{selectedCourt.address}</p>
                                    </div>
                                    <div className="booking-intro-meta">
                                        <span>Timezone</span>
                                        <strong>Pacific Time</strong>
                                    </div>
                                </div>

                                {cooldownInfo?.in_cooldown && (
                                    <div className="cooldown-warning">
                                        <WarningIcon />
                                        <span>Cooldown active until {new Date(cooldownInfo.cooldown_end).toLocaleTimeString()}</span>
                                    </div>
                                )}
                                <div className="schedule-shell">
                                    <div className="schedule-calendar-card">
                                        <div className="schedule-card-header">
                                            <div>
                                                <span className="section-kicker">Choose Date</span>
                                                <h3>{formatMonthLabel(calendarMonth)}</h3>
                                            </div>
                                            <div className="calendar-nav">
                                                <button
                                                    type="button"
                                                    className="calendar-nav-btn"
                                                    onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                                                    disabled={calendarMonth.getTime() <= startOfMonth(minBookableDate).getTime()}
                                                >
                                                    Prev
                                                </button>
                                                <button
                                                    type="button"
                                                    className="calendar-nav-btn"
                                                    onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                                                    disabled={calendarMonth.getTime() >= maxCalendarMonth.getTime()}
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>

                                        <div className="calendar-weekdays">
                                            {WEEKDAY_LABELS.map((label) => (
                                                <span key={label}>{label}</span>
                                            ))}
                                        </div>

                                        <div className="calendar-grid">
                                            {calendarDays.map((day) => (
                                                <button
                                                    key={day.dateKey}
                                                    type="button"
                                                    className={`calendar-day ${day.isCurrentMonth ? 'current-month' : 'outside-month'} ${day.isToday ? 'today' : ''} ${selectedDateKey === day.dateKey ? 'selected' : ''} ${day.isDisabled ? 'disabled' : ''} ${day.bookedSlots > 0 ? 'busy' : ''}`}
                                                    onClick={() => handleCalendarDaySelect(day)}
                                                >
                                                    <span className="calendar-day-number">{day.date.getDate()}</span>
                                                    <span className="calendar-day-meta">
                                                        {day.isDisabled
                                                            ? 'Unavailable'
                                                            : day.bookedSlots > 0
                                                                ? `${day.availableSlots} open`
                                                                : 'Open'}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="schedule-legend">
                                            <span><i className="legend-dot available"></i>Available</span>
                                            <span><i className="legend-dot booked"></i>Partially booked</span>
                                            <span><i className="legend-dot blocked"></i>Unavailable / passed</span>
                                        </div>
                                    </div>

                                    <div className="schedule-slots-card">
                                        <div className="schedule-card-header">
                                            <div>
                                                <span className="section-kicker">Choose Time</span>
                                                <h3>{formatShortDateLabel(selectedDateKey)}</h3>
                                            </div>
                                            <div className="availability-badge">
                                                {availabilityLoading
                                                    ? 'Loading...'
                                                    : selectedDateAvailability.availableSlots > 0
                                                        ? `${selectedDateAvailability.availableSlots} slots open`
                                                        : 'No slots open'}
                                            </div>
                                        </div>

                                        <div className="schedule-presets">
                                            {schedulePresets.map((preset) => {
                                                const presetSelection = getPresetReservationSelection(preset.preset);
                                                const isActivePreset = selectedDateKey === presetSelection.dateKey && selectedTimeMinutes === presetSelection.minutes;

                                                return (
                                                    <button
                                                        key={preset.label}
                                                        type="button"
                                                        className={`schedule-preset ${isActivePreset ? 'active' : ''}`}
                                                        onClick={() => handleSchedulePreset(preset.preset)}
                                                    >
                                                        {preset.label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {availabilityLoading ? (
                                            <div className="schedule-loading">
                                                <div className="spinner"></div>
                                                <p>Checking live availability for this court...</p>
                                            </div>
                                        ) : selectedDateAvailability.isDisabled ? (
                                            <div className="schedule-empty">
                                                <ClockIcon />
                                                <p>This date is unavailable. Pick another date in the booking window.</p>
                                            </div>
                                        ) : (
                                            <div className="time-groups">
                                                {selectedTimeGroups.map((group) => (
                                                    <div key={group.label} className="time-group">
                                                        <div className="time-group-header">
                                                            <span>{group.label}</span>
                                                        </div>
                                                        <div className="time-slot-grid">
                                                            {group.slots.map((minutes) => {
                                                                const slotStatus = getSlotStatus(
                                                                    selectedDateKey,
                                                                    minutes,
                                                                    Number(formData.duration_hours),
                                                                    courtReservations,
                                                                    bookingNow,
                                                                    maxBookableDate
                                                                );

                                                                return (
                                                                    <button
                                                                        key={`${group.label}-${minutes}`}
                                                                        type="button"
                                                                        className={`time-slot ${slotStatus} ${selectedTimeMinutes === minutes ? 'selected' : ''}`}
                                                                        onClick={() => handleTimeSlotSelect(minutes, slotStatus)}
                                                                    >
                                                                        <span>{formatSlotLabel(minutes)}</span>
                                                                        <small>
                                                                            {slotStatus === 'available'
                                                                                ? 'Available'
                                                                                : slotStatus === 'booked'
                                                                                    ? 'Booked'
                                                                                    : 'Unavailable'}
                                                                        </small>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="booking-composer-grid">
                                    <div className="booking-form-card">
                                        <div className="booking-panel-header">
                                            <div>
                                                <span className="section-kicker">Player Details</span>
                                                <h3>Finish the reservation profile</h3>
                                                <p>These details generate the QR booking and secure passcode-based cancellation.</p>
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Players</label>
                                                <select
                                                    value={formData.number_of_players}
                                                    onChange={(e) => setFormData({ ...formData, number_of_players: parseInt(e.target.value, 10) })}
                                                >
                                                    <option value={1}>1 Player</option>
                                                    <option value={2}>2 Players</option>
                                                    <option value={3}>3 Players</option>
                                                    <option value={4}>4 Players</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Duration</label>
                                                <select
                                                    value={formData.duration_hours}
                                                    onChange={(e) => handleChangeReservationDuration(parseFloat(e.target.value))}
                                                >
                                                    <option value={0.5}>30 minutes</option>
                                                    <option value={1}>1 hour</option>
                                                    <option value={1.5}>1.5 hours</option>
                                                    <option value={2}>2 hours</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Full Name *</label>
                                                <input
                                                    type="text"
                                                    value={formData.player_name}
                                                    onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
                                                    required
                                                    placeholder="Enter your full name"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Email Address</label>
                                                <input
                                                    type="email"
                                                    value={formData.player_email}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, player_email: e.target.value });
                                                        checkCooldown(e.target.value);
                                                    }}
                                                    placeholder="your@email.com"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Phone Number</label>
                                                <input
                                                    type="tel"
                                                    value={formData.player_phone}
                                                    onChange={(e) => setFormData({ ...formData, player_phone: e.target.value })}
                                                    placeholder="(555) 123-4567"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Passcode *</label>
                                                <input
                                                    type="password"
                                                    value={formData.passcode}
                                                    onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
                                                    required
                                                    placeholder="Create a passcode for cancellation"
                                                />
                                                <small className="field-hint">Use this passcode later if you need to cancel the reservation.</small>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="booking-summary-stack">
                                        {schedulePreviewStart && schedulePreviewEnd && !Number.isNaN(schedulePreviewStart.getTime()) && !Number.isNaN(schedulePreviewEnd.getTime()) && (
                                            <div className="schedule-summary-card">
                                                <div className="schedule-summary-header">
                                                    <div>
                                                        <span className="section-kicker">Reservation Preview</span>
                                                        <h3>{selectedCourt.name}</h3>
                                                        <p className="booking-summary-copy">Your QR check-in and cancellation window will follow this exact booking slot.</p>
                                                    </div>
                                                    <div className="schedule-duration-pill">
                                                        {formData.duration_hours}h
                                                    </div>
                                                </div>
                                                <div className="detail-card booking-detail-card">
                                                    <div className="detail-row">
                                                        <span>Reservation Start</span>
                                                        <strong>{formatScheduleDateTime(schedulePreviewStart)}</strong>
                                                    </div>
                                                    <div className="detail-row">
                                                        <span>Estimated End</span>
                                                        <strong>{formatScheduleDateTime(schedulePreviewEnd)}</strong>
                                                    </div>
                                                    <div className="detail-row">
                                                        <span>Policy</span>
                                                        <strong>Passcode required to cancel</strong>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="detail-card booking-note-card">
                                            <div className="detail-row">
                                                <span>Booking Window</span>
                                                <strong>Reservations are limited to the next {MAX_BOOKING_WINDOW_DAYS} days.</strong>
                                            </div>
                                            <div className="detail-row">
                                                <span>Unavailable Slots</span>
                                                <strong>Past or already-booked times are blocked so duplicate bookings cannot slip through.</strong>
                                            </div>
                                            <div className="detail-row">
                                                <span>Confirmation</span>
                                                <strong>Your QR code will reflect the exact date and time you selected.</strong>
                                            </div>
                                        </div>
                                        <div className="price-summary">
                                            <span>Total Cost:</span>
                                            <span className="price-free">FREE</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowReservationModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={cooldownInfo?.in_cooldown || availabilityLoading || !formData.start_time}
                                >
                                    Confirm Scheduled Booking
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showWaitlistModal && selectedCourt && (
                <div className="modal-overlay" onClick={() => setShowWaitlistModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Waitlist - {selectedCourt.name}</h2>
                            <button className="modal-close" onClick={() => setShowWaitlistModal(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <form onSubmit={submitWaitlist}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        value={waitlistData.player_name}
                                        onChange={(e) => setWaitlistData({ ...waitlistData, player_name: e.target.value })}
                                        required
                                        placeholder="Enter your full name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        value={waitlistData.player_email}
                                        onChange={(e) => setWaitlistData({ ...waitlistData, player_email: e.target.value })}
                                        placeholder="your@email.com"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        value={waitlistData.player_phone}
                                        onChange={(e) => setWaitlistData({ ...waitlistData, player_phone: e.target.value })}
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Players</label>
                                        <select
                                            value={waitlistData.number_of_players}
                                            onChange={(e) => setWaitlistData({ ...waitlistData, number_of_players: parseInt(e.target.value, 10) })}
                                        >
                                            <option value={1}>1 Player</option>
                                            <option value={2}>2 Players</option>
                                            <option value={3}>3 Players</option>
                                            <option value={4}>4 Players</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Duration</label>
                                        <select
                                            value={waitlistData.duration_hours}
                                            onChange={(e) => setWaitlistData({ ...waitlistData, duration_hours: parseFloat(e.target.value) })}
                                        >
                                            <option value={1}>1 hour</option>
                                            <option value={1.5}>1.5 hours</option>
                                            <option value={2}>2 hours</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Preferred Date</label>
                                        <input
                                            type="date"
                                            value={waitlistData.preferred_date}
                                            onChange={(e) => setWaitlistData({ ...waitlistData, preferred_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Preferred Time</label>
                                        <input
                                            type="time"
                                            value={waitlistData.preferred_time}
                                            onChange={(e) => setWaitlistData({ ...waitlistData, preferred_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowWaitlistModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Join Waitlist
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showQRModal && reservationDetails && (
                <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Reservation Confirmed</h2>
                            <button className="modal-close" onClick={() => setShowQRModal(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-card booking-detail-card">
                                <div className="detail-row">
                                    <span>Start</span>
                                    <strong>{formatScheduleDateTime(reservationDetails.start_time)}</strong>
                                </div>
                                <div className="detail-row">
                                    <span>End</span>
                                    <strong>{formatScheduleDateTime(reservationDetails.end_time)}</strong>
                                </div>
                            </div>
                            <div className="qr-container">
                                <img src={reservationDetails.qr_code} alt="QR Code" />
                                <p className="qr-instruction">Present this QR code at the court for the scheduled time you selected.</p>
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
        </div>
    );
}

export default Courts;
