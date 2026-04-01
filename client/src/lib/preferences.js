const FAVORITE_COURTS_KEY = 'tennisbook.favoriteCourts';
const BOOKING_PROFILE_KEY = 'tennisbook.bookingProfile';

export const DEFAULT_BOOKING_PROFILE = {
    player_name: '',
    player_email: '',
    player_phone: '',
    number_of_players: 2
};

function canUseStorage() {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function readJson(key, fallbackValue) {
    if (!canUseStorage()) {
        return fallbackValue;
    }

    try {
        const rawValue = window.localStorage.getItem(key);

        if (!rawValue) {
            return fallbackValue;
        }

        return JSON.parse(rawValue);
    } catch (error) {
        return fallbackValue;
    }
}

function writeJson(key, value) {
    if (!canUseStorage()) {
        return;
    }

    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        // Ignore storage failures so booking still works in restricted browsers.
    }
}

export function loadFavoriteCourtIds() {
    const storedIds = readJson(FAVORITE_COURTS_KEY, []);

    if (!Array.isArray(storedIds)) {
        return [];
    }

    return [...new Set(
        storedIds
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id))
    )];
}

export function saveFavoriteCourtIds(courtIds) {
    writeJson(
        FAVORITE_COURTS_KEY,
        [...new Set(
            courtIds
                .map((id) => Number(id))
                .filter((id) => Number.isFinite(id))
        )]
    );
}

export function loadBookingProfile() {
    const storedProfile = readJson(BOOKING_PROFILE_KEY, DEFAULT_BOOKING_PROFILE);

    if (!storedProfile || typeof storedProfile !== 'object') {
        return DEFAULT_BOOKING_PROFILE;
    }

    return {
        ...DEFAULT_BOOKING_PROFILE,
        player_name: `${storedProfile.player_name || ''}`.trim(),
        player_email: `${storedProfile.player_email || ''}`.trim(),
        player_phone: `${storedProfile.player_phone || ''}`.trim(),
        number_of_players: Number(storedProfile.number_of_players) || DEFAULT_BOOKING_PROFILE.number_of_players
    };
}

export function saveBookingProfile(profile) {
    writeJson(BOOKING_PROFILE_KEY, {
        player_name: `${profile?.player_name || ''}`.trim(),
        player_email: `${profile?.player_email || ''}`.trim(),
        player_phone: `${profile?.player_phone || ''}`.trim(),
        number_of_players: Number(profile?.number_of_players) || DEFAULT_BOOKING_PROFILE.number_of_players
    });
}
