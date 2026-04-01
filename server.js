const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;
const DB_PATH = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(__dirname, 'tennis_courts.db');
const MILPITAS_CENTER = { latitude: 37.4323, longitude: -121.8996 };
const DEFAULT_RADIUS = 5000;
const MAX_BOOKING_WINDOW_DAYS = 30;
const DEFAULT_CITY = 'Milpitas';
const DEFAULT_STATE = 'CA';
const GENERIC_COURT_NAME_REGEX = /^Tennis Court #\d+$/i;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

let db;

function normalizeText(value) {
    return value ? String(value).replace(/\s+/g, ' ').trim() : '';
}

function hasMeaningfulCourtName(name) {
    const normalized = normalizeText(name);
    return Boolean(normalized && !GENERIC_COURT_NAME_REGEX.test(normalized) && !/^Tennis Court$/i.test(normalized));
}

function getElementCoords(element) {
    return {
        latitude: element.lat || element.center?.lat,
        longitude: element.lon || element.center?.lon
    };
}

function toRadians(value) {
    return (value * Math.PI) / 180;
}

function getDistanceMeters(lat1, lon1, lat2, lon2) {
    const earthRadius = 6371000;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatState(state) {
    const normalized = normalizeText(state);

    if (!normalized) {
        return DEFAULT_STATE;
    }

    if (normalized.length === 2) {
        return normalized.toUpperCase();
    }

    if (/california/i.test(normalized)) {
        return 'CA';
    }

    return normalized;
}

function extractAddressParts(tags = {}) {
    return {
        houseNumber: normalizeText(tags['addr:housenumber']),
        street: normalizeText(tags['addr:street'] || tags['addr:place']),
        city: normalizeText(tags['addr:city']) || DEFAULT_CITY,
        state: formatState(tags['addr:state']),
        postcode: normalizeText(tags['addr:postcode'])
    };
}

function hasAddressData(tags = {}) {
    const address = extractAddressParts(tags);
    return Boolean(address.street || address.houseNumber || address.postcode);
}

function getVenueCategory(tags = {}) {
    const amenity = tags.amenity;
    const leisure = tags.leisure;
    const landuse = tags.landuse;
    const building = tags.building;

    if (['school', 'college', 'university', 'community_centre'].includes(amenity) ||
        building === 'school' ||
        landuse === 'education') {
        return 'campus';
    }

    if (['park', 'recreation_ground', 'playground'].includes(leisure) ||
        landuse === 'recreation_ground') {
        return 'park';
    }

    if (leisure === 'sports_centre') {
        return 'sports';
    }

    if (leisure === 'pitch') {
        return 'pitch';
    }

    return 'other';
}

function getVenueMaxDistance(category) {
    switch (category) {
        case 'campus':
            return 360;
        case 'park':
            return 320;
        case 'sports':
            return 220;
        case 'pitch':
            return 180;
        default:
            return 180;
    }
}

function getVenueBaseWeight(category) {
    switch (category) {
        case 'campus':
            return 360;
        case 'park':
            return 300;
        case 'sports':
            return 220;
        case 'pitch':
            return 180;
        default:
            return 120;
    }
}

function scoreVenueCandidate(court, candidate) {
    const candidateCoords = getElementCoords(candidate);

    if (!candidateCoords.latitude || !candidateCoords.longitude) {
        return Number.NEGATIVE_INFINITY;
    }

    const category = getVenueCategory(candidate.tags);
    const distance = getDistanceMeters(
        court.latitude,
        court.longitude,
        candidateCoords.latitude,
        candidateCoords.longitude
    );

    if (distance > getVenueMaxDistance(category)) {
        return Number.NEGATIVE_INFINITY;
    }

    let score = getVenueBaseWeight(category) - distance;

    if (candidate.tags?.sport === 'tennis') {
        score += 12;
    }

    if (/tennis/i.test(candidate.tags?.name || '')) {
        score += 8;
    }

    if (hasAddressData(candidate.tags)) {
        score += 6;
    }

    return score;
}

function pickBestVenue(court, venues) {
    let bestVenue = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    venues.forEach((venue) => {
        const score = scoreVenueCandidate(court, venue);
        if (score > bestScore) {
            bestScore = score;
            bestVenue = venue;
        }
    });

    return bestVenue;
}

function countSharedNameTokens(left, right) {
    const leftTokens = new Set(
        normalizeText(left)
            .toLowerCase()
            .split(/[^a-z0-9]+/i)
            .filter((token) => token.length >= 3)
    );
    const rightTokens = new Set(
        normalizeText(right)
            .toLowerCase()
            .split(/[^a-z0-9]+/i)
            .filter((token) => token.length >= 3)
    );

    let sharedCount = 0;
    leftTokens.forEach((token) => {
        if (rightTokens.has(token)) {
            sharedCount += 1;
        }
    });

    return sharedCount;
}

function pickBestAddressVenue(court, venues, preferredVenue) {
    if (preferredVenue && hasAddressData(preferredVenue.tags)) {
        return preferredVenue;
    }

    let bestVenue = preferredVenue || null;
    let bestScore = Number.NEGATIVE_INFINITY;

    venues.forEach((venue) => {
        if (!hasAddressData(venue.tags)) {
            return;
        }

        const venueCoords = getElementCoords(venue);
        const distance = getDistanceMeters(
            court.latitude,
            court.longitude,
            venueCoords.latitude,
            venueCoords.longitude
        );

        if (distance > 360) {
            return;
        }

        let score = 220 - distance;
        score += countSharedNameTokens(preferredVenue?.tags?.name, venue.tags?.name) * 18;

        if (venue.tags?.amenity === 'school') {
            score += 10;
        }

        if (score > bestScore) {
            bestScore = score;
            bestVenue = venue;
        }
    });

    return bestVenue;
}

function cleanVenueBaseName(name) {
    const normalized = normalizeText(name);
    const stripped = normalized
        .replace(/\bN\.?\s*J\.?\s*R\.?\s*O\.?\s*T\.?\s*C\.?\b/ig, '')
        .replace(/\broom\b.*$/i, '')
        .replace(/\/+/g, ' ')
        .replace(/\btennis courts?\b/ig, '')
        .replace(/\bcourts?\b$/i, '')
        .replace(/[,-]\s*$/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

    return stripped || normalized;
}

function pickNamingVenue(preferredVenue, addressVenue) {
    if (addressVenue?.tags?.amenity === 'school' || addressVenue?.tags?.building === 'school') {
        const sharedTokens = countSharedNameTokens(preferredVenue?.tags?.name, addressVenue?.tags?.name);
        const preferredCategory = getVenueCategory(preferredVenue?.tags);

        if (!preferredVenue ||
            sharedTokens >= 1 ||
            ['sports', 'pitch', 'other'].includes(preferredCategory) ||
            preferredVenue?.tags?.building === 'school') {
            return addressVenue;
        }
    }

    return preferredVenue || addressVenue || null;
}

function buildCourtBaseName(courtTags, venue, reverseAddress) {
    if (hasMeaningfulCourtName(courtTags?.name)) {
        return normalizeText(courtTags.name);
    }

    if (venue?.tags?.name) {
        return `${cleanVenueBaseName(venue.tags.name)} Tennis Court`;
    }

    const reverseRoad = normalizeText(
        reverseAddress?.road ||
        reverseAddress?.pedestrian ||
        reverseAddress?.footway ||
        reverseAddress?.path
    );

    if (reverseRoad) {
        return `${reverseRoad} Tennis Court`;
    }

    return 'Milpitas Tennis Court';
}

function buildFormattedAddress({ venueName, houseNumber, street, city, state, postcode }) {
    const streetLine = [normalizeText(houseNumber), normalizeText(street)].filter(Boolean).join(' ');
    let locality = [normalizeText(city), formatState(state)].filter(Boolean).join(', ');

    if (normalizeText(postcode)) {
        locality = locality ? `${locality} ${normalizeText(postcode)}` : normalizeText(postcode);
    }

    return [normalizeText(venueName), streetLine, locality].filter(Boolean).join(', ');
}

function buildCourtAddress(courtTags, venue, addressVenue, reverseAddress) {
    const courtAddress = extractAddressParts(courtTags);
    const venueAddress = extractAddressParts(addressVenue?.tags);

    return buildFormattedAddress({
        venueName: normalizeText(venue?.tags?.name || addressVenue?.tags?.name),
        houseNumber: courtAddress.houseNumber || venueAddress.houseNumber || normalizeText(reverseAddress?.house_number),
        street: courtAddress.street ||
            venueAddress.street ||
            normalizeText(
                reverseAddress?.road ||
                reverseAddress?.pedestrian ||
                reverseAddress?.footway ||
                reverseAddress?.path
            ),
        city: courtAddress.city ||
            venueAddress.city ||
            normalizeText(
                reverseAddress?.city ||
                reverseAddress?.town ||
                reverseAddress?.village
            ) ||
            DEFAULT_CITY,
        state: courtAddress.state ||
            venueAddress.state ||
            normalizeText(reverseAddress?.state) ||
            DEFAULT_STATE,
        postcode: courtAddress.postcode ||
            venueAddress.postcode ||
            normalizeText(reverseAddress?.postcode)
    });
}

function isPublicCourt(court) {
    const access = court.access || 'public';
    const isPublic = !access ||
        access === 'public' ||
        access === 'yes' ||
        access === 'permissive';

    const name = normalizeText(court.name).toLowerCase();
    const isNotPrivate = access !== 'private' &&
        access !== 'customers' &&
        court.fee !== 'yes' &&
        !name.includes('private') &&
        !name.includes('club');

    return court.latitude && court.longitude && isPublic && isNotPrivate;
}

async function reverseGeocode(latitude, longitude) {
    try {
        const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: {
                format: 'jsonv2',
                lat: latitude,
                lon: longitude,
                zoom: 18,
                addressdetails: 1
            },
            headers: {
                'User-Agent': 'TennisBook/1.0 (Milpitas court enrichment)',
                'Accept-Language': 'en-US'
            }
        });

        return response.data?.address || null;
    } catch (error) {
        console.warn('Reverse geocode failed:', error.message);
        return null;
    }
}

function buildGroupKey(court, venue) {
    if (venue) {
        return `${venue.type}:${venue.id}`;
    }

    return `${court.latitude.toFixed(4)},${court.longitude.toFixed(4)}`;
}

async function enrichCourtsFromOsm(rawCourts, rawVenues) {
    const draftCourts = rawCourts
        .map((court) => {
            const venue = pickBestVenue(court, rawVenues);
            const addressVenue = pickBestAddressVenue(court, rawVenues, venue);
            const namingVenue = pickNamingVenue(venue, addressVenue);

            return {
                ...court,
                venue,
                addressVenue,
                namingVenue,
                has_explicit_name: hasMeaningfulCourtName(court.name),
                group_key: buildGroupKey(court, namingVenue || venue)
            };
        })
        .filter(isPublicCourt);

    const reverseAddressByGroup = new Map();
    const groupsNeedingReverseGeocode = draftCourts.filter((court) => {
        const addressText = buildCourtAddress(court.raw_tags, court.venue, court.addressVenue, null);
        return !extractAddressParts(court.raw_tags).street &&
            !extractAddressParts(court.addressVenue?.tags).street &&
            (!addressText || addressText.split(',').length < 3);
    });

    for (let index = 0; index < groupsNeedingReverseGeocode.length; index += 1) {
        const court = groupsNeedingReverseGeocode[index];

        if (!reverseAddressByGroup.has(court.group_key)) {
            const reverseAddress = await reverseGeocode(court.latitude, court.longitude);
            reverseAddressByGroup.set(court.group_key, reverseAddress);

            if (index < groupsNeedingReverseGeocode.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 1100));
            }
        }
    }

    const courtsWithNames = draftCourts.map((court) => {
        const reverseAddress = reverseAddressByGroup.get(court.group_key);
        const address = buildCourtAddress(court.raw_tags, court.namingVenue, court.addressVenue, reverseAddress);
        const baseName = buildCourtBaseName(court.raw_tags, court.namingVenue, reverseAddress);

        return {
            ...court,
            name: baseName,
            address: address || `${DEFAULT_CITY}, ${DEFAULT_STATE}`
        };
    });

    const groupedCourts = courtsWithNames.reduce((groups, court) => {
        if (!groups[court.group_key]) {
            groups[court.group_key] = [];
        }

        groups[court.group_key].push(court);
        return groups;
    }, {});

    Object.values(groupedCourts).forEach((group) => {
        group.sort((left, right) => left.longitude - right.longitude || left.latitude - right.latitude);
        const shouldNumberCourts = group.length > 1 && group.some((court) => !court.has_explicit_name);

        group.forEach((court, index) => {
            if (!court.has_explicit_name && shouldNumberCourts) {
                court.name = `${court.name} ${index + 1}`;
            }
        });
    });

    const duplicateNameGroups = courtsWithNames.reduce((groups, court) => {
        if (!groups[court.name]) {
            groups[court.name] = [];
        }

        groups[court.name].push(court);
        return groups;
    }, {});

    Object.values(duplicateNameGroups).forEach((group) => {
        if (group.length <= 1 || group.some((court) => court.has_explicit_name)) {
            return;
        }

        group.sort((left, right) => left.longitude - right.longitude || left.latitude - right.latitude);
        group.forEach((court, index) => {
            court.name = `${court.name} ${index + 1}`;
        });
    });

    return courtsWithNames.map((court) => ({
        osm_id: court.osm_id,
        name: court.name,
        address: court.address,
        latitude: court.latitude,
        longitude: court.longitude,
        surface: court.surface,
        indoor: court.indoor,
        lights: court.lights,
        access: court.access,
        fee: court.fee,
        opening_hours: court.opening_hours
    }));
}

// Fetch tennis courts from OpenStreetMap Overpass API - Milpitas only
async function fetchTennisCourtsFromOSM(lat, lng, radius = DEFAULT_RADIUS) {
    const query = `
        [out:json][timeout:25];
        area["name"="Milpitas"]["admin_level"="8"]->.milpitas;
        (
            node["leisure"="pitch"]["sport"="tennis"](area.milpitas);
            way["leisure"="pitch"]["sport"="tennis"](area.milpitas);
            relation["leisure"="pitch"]["sport"="tennis"](area.milpitas);
        )->.courts;
        (
            node["name"]["amenity"~"school|college|university|community_centre|sports_centre"](area.milpitas);
            way["name"]["amenity"~"school|college|university|community_centre|sports_centre"](area.milpitas);
            relation["name"]["amenity"~"school|college|university|community_centre|sports_centre"](area.milpitas);
            node["name"]["leisure"~"park|sports_centre|recreation_ground|pitch|playground"](area.milpitas);
            way["name"]["leisure"~"park|sports_centre|recreation_ground|pitch|playground"](area.milpitas);
            relation["name"]["leisure"~"park|sports_centre|recreation_ground|pitch|playground"](area.milpitas);
            node["name"]["landuse"~"recreation_ground|education"](area.milpitas);
            way["name"]["landuse"~"recreation_ground|education"](area.milpitas);
            relation["name"]["landuse"~"recreation_ground|education"](area.milpitas);
            node["name"]["building"="school"](area.milpitas);
            way["name"]["building"="school"](area.milpitas);
            relation["name"]["building"="school"](area.milpitas);
        )->.venues;
        (
            .courts;
            .venues;
        );
        out center;
    `;

    try {
        const response = await axios.post('https://overpass-api.de/api/interpreter', query);
        const elements = response.data.elements || [];
        const rawCourts = elements
            .filter((el) => el.tags?.leisure === 'pitch' && el.tags?.sport === 'tennis')
            .map((el) => {
                const coords = getElementCoords(el);

                return {
                    osm_id: el.id,
                    raw_tags: el.tags || {},
                    name: el.tags?.name || `Tennis Court #${el.id}`,
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    surface: el.tags?.surface || 'hard',
                    indoor: el.tags?.indoor === 'yes' ? 1 : 0,
                    lights: el.tags?.lit === 'yes' ? 1 : 0,
                    access: el.tags?.access || 'public',
                    fee: el.tags?.fee || 'no',
                    opening_hours: el.tags?.opening_hours || '24/7'
                };
            });

        const rawVenues = elements.filter((el) =>
            el.tags?.name &&
            !(el.tags?.leisure === 'pitch' && el.tags?.sport === 'tennis')
        );

        return enrichCourtsFromOsm(rawCourts, rawVenues);
    } catch (error) {
        console.error('Error fetching from Overpass API:', error.message);
        return [];
    }
}

function upsertCourts(courts) {
    const insertStmt = db.prepare(`
        INSERT INTO courts (id, osm_id, name, address, latitude, longitude, surface_type, indoor, lights, access_type, fee, opening_hours, hourly_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateStmt = db.prepare(`
        UPDATE courts
        SET name = ?,
            address = ?,
            latitude = ?,
            longitude = ?,
            surface_type = ?,
            indoor = ?,
            lights = ?,
            access_type = ?,
            fee = ?,
            opening_hours = ?,
            hourly_rate = ?
        WHERE id = ?
    `);

    let addedCount = 0;
    let updatedCount = 0;

    courts.forEach((court) => {
        const existing = db.exec("SELECT id FROM courts WHERE osm_id = ?", [court.osm_id]);
        const isFree = court.fee === 'no' || ['public', 'yes', 'permissive'].includes(court.access);

        if (existing[0] && existing[0].values.length > 0) {
            const existingId = existing[0].values[0][0];
            updateStmt.run([
                court.name,
                court.address,
                court.latitude,
                court.longitude,
                court.surface,
                court.indoor,
                court.lights,
                court.access,
                court.fee,
                court.opening_hours,
                isFree ? 0 : 10,
                existingId
            ]);
            updatedCount += 1;
        } else {
            insertStmt.run([
                uuidv4(),
                court.osm_id,
                court.name,
                court.address,
                court.latitude,
                court.longitude,
                court.surface,
                court.indoor,
                court.lights,
                court.access,
                court.fee,
                court.opening_hours,
                isFree ? 0 : 10
            ]);
            addedCount += 1;
        }
    });

    insertStmt.free();
    updateStmt.free();

    return { addedCount, updatedCount };
}

async function syncCourtsFromOSM(latitude = MILPITAS_CENTER.latitude, longitude = MILPITAS_CENTER.longitude, radius = DEFAULT_RADIUS) {
    const courts = await fetchTennisCourtsFromOSM(latitude, longitude, radius);

    if (courts.length === 0) {
        return { courts: [], addedCount: 0, updatedCount: 0 };
    }

    const syncResult = upsertCourts(courts);
    saveDatabase();

    return { courts, ...syncResult };
}

function needsCourtMetadataRepair() {
    const result = db.exec(`
        SELECT COUNT(*) AS count
        FROM courts
        WHERE osm_id IS NOT NULL
          AND (
              name LIKE 'Tennis Court #%'
              OR address = 'Tennis Court, Milpitas, CA'
              OR address = 'Milpitas, CA'
          )
    `);

    return (result[0]?.values?.[0]?.[0] || 0) > 0;
}

// Initialize SQLite Database
async function initDatabase() {
    const SQL = await initSqlJs();
    const dbDirectory = path.dirname(DB_PATH);

    if (!fs.existsSync(dbDirectory)) {
        fs.mkdirSync(dbDirectory, { recursive: true });
    }

    // Try to load existing database or create new one
    let data;
    if (fs.existsSync(DB_PATH)) {
        data = fs.readFileSync(DB_PATH);
    }

    db = data ? new SQL.Database(data) : new SQL.Database();

    // Create tables
    db.run(`
        CREATE TABLE IF NOT EXISTS courts (
            id TEXT PRIMARY KEY,
            osm_id INTEGER UNIQUE,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            surface_type TEXT DEFAULT 'hard',
            indoor INTEGER DEFAULT 0,
            lights INTEGER DEFAULT 0,
            access_type TEXT DEFAULT 'public',
            fee TEXT DEFAULT 'no',
            opening_hours TEXT DEFAULT '24/7',
            hourly_rate REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS reservations (
            id TEXT PRIMARY KEY,
            court_id TEXT NOT NULL,
            player_name TEXT NOT NULL,
            player_email TEXT,
            player_phone TEXT,
            number_of_players INTEGER DEFAULT 2,
            start_time DATETIME NOT NULL,
            end_time DATETIME NOT NULL,
            duration_hours REAL NOT NULL,
            status TEXT DEFAULT 'active',
            qr_code TEXT,
            passcode_hash TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (court_id) REFERENCES courts(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS waitlist (
            id TEXT PRIMARY KEY,
            court_id TEXT NOT NULL,
            player_name TEXT NOT NULL,
            player_email TEXT,
            player_phone TEXT,
            number_of_players INTEGER DEFAULT 2,
            preferred_date TEXT,
            preferred_time TEXT,
            duration_hours REAL DEFAULT 1,
            position INTEGER,
            status TEXT DEFAULT 'waiting',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (court_id) REFERENCES courts(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS cooldowns (
            id TEXT PRIMARY KEY,
            court_id TEXT NOT NULL,
            player_name TEXT NOT NULL,
            player_email TEXT,
            end_time DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (court_id) REFERENCES courts(id)
        )
    `);

    ensureReservationPasscodeColumn();

    // Check if we need to fetch real data
    const result = db.exec("SELECT COUNT(*) as count FROM courts");
    const courtCount = result[0].values[0][0];

    if (courtCount === 0) {
        console.log('Fetching tennis courts from OpenStreetMap...');
        const syncResult = await syncCourtsFromOSM(MILPITAS_CENTER.latitude, MILPITAS_CENTER.longitude, DEFAULT_RADIUS);

        if (syncResult.courts.length > 0) {
            console.log(`Added ${syncResult.addedCount} tennis courts from OpenStreetMap`);
        } else {
            // Fallback to sample data if API fails
            console.log('No courts found from API, adding fallback data...');
            const fallbackCourts = [
                { name: 'Gill Park Tennis Courts', address: 'Gill Park, Milpitas, CA 95035', lat: 37.4344, lng: -121.8990 },
                { name: 'Milpitas High School Tennis', address: 'Milpitas High School, Milpitas, CA 95035', lat: 37.4289, lng: -121.8956 },
                { name: 'Dixon Landing Park Tennis', address: 'Dixon Landing Rd, Milpitas, CA 95035', lat: 37.4412, lng: -121.9025 },
                { name: 'Cardoza Park Tennis Courts', address: 'Cardoza Park, Milpitas, CA 95035', lat: 37.4378, lng: -121.8934 },
                { name: 'Sunnyhills Park Tennis', address: 'Sunnyhills Park, Milpitas, CA 95035', lat: 37.4256, lng: -121.8889 }
            ];

            const stmt = db.prepare("INSERT INTO courts (id, name, address, latitude, longitude, surface_type, indoor, lights, access_type, fee, opening_hours, hourly_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            fallbackCourts.forEach(court => {
                stmt.run([uuidv4(), court.name, court.address, court.lat, court.lng, 'hard', 0, 1, 'public', 'no', '24/7', 0]);
            });
            stmt.free();
        }
    } else if (needsCourtMetadataRepair()) {
        console.log('Repairing generic court names and addresses from OpenStreetMap...');
        try {
            const syncResult = await syncCourtsFromOSM(MILPITAS_CENTER.latitude, MILPITAS_CENTER.longitude, DEFAULT_RADIUS);
            console.log(`Repaired ${syncResult.updatedCount} existing court records`);
        } catch (error) {
            console.warn('Court metadata repair skipped:', error.message);
        }
    }

    // Save database to file
    saveDatabase();
}

function saveDatabase() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

function getTableColumns(tableName) {
    const result = db.exec(`PRAGMA table_info(${tableName})`);

    if (!result[0]) {
        return [];
    }

    return result[0].values.map((row) => row[1]);
}

function ensureReservationPasscodeColumn() {
    const columns = getTableColumns('reservations');

    if (!columns.includes('passcode_hash')) {
        db.run('ALTER TABLE reservations ADD COLUMN passcode_hash TEXT');
    }
}

function normalizePasscode(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function hashPasscode(passcode) {
    return crypto.createHash('sha256').update(passcode).digest('hex');
}

function verifyPasscode(passcode, passcodeHash) {
    const normalizedPasscode = normalizePasscode(passcode);

    if (!normalizedPasscode || !passcodeHash) {
        return false;
    }

    const expectedBuffer = Buffer.from(passcodeHash, 'hex');
    const actualBuffer = Buffer.from(hashPasscode(normalizedPasscode), 'hex');

    if (expectedBuffer.length !== actualBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function parseReservationStartTime(value) {
    if (!value) {
        return null;
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    return parsedDate;
}

// Helper function to check cooldown
function isInCooldown(courtId, playerEmail) {
    if (!playerEmail) return false;
    const result = db.exec(
        "SELECT COUNT(*) FROM cooldowns WHERE court_id = ? AND player_email = ? AND end_time > datetime('now')",
        [courtId, playerEmail]
    );
    return result[0].values[0][0] > 0;
}

// Helper function to clean expired reservations
function cleanExpiredReservations() {
    db.run("UPDATE reservations SET status = 'completed' WHERE end_time < datetime('now') AND status = 'active'");
    saveDatabase();
}

// API Routes

// Refresh courts from OpenStreetMap
app.post('/api/courts/refresh', async (req, res) => {
    try {
        const { latitude, longitude, radius } = req.body;
        const lat = latitude || MILPITAS_CENTER.latitude;
        const lng = longitude || MILPITAS_CENTER.longitude;
        const searchRadius = radius || DEFAULT_RADIUS;

        console.log(`Refreshing courts for location: ${lat}, ${lng} with radius ${searchRadius}m`);
        const syncResult = await syncCourtsFromOSM(lat, lng, searchRadius);

        if (syncResult.courts.length > 0) {
            res.json({
                message: `Synced ${syncResult.courts.length} courts from OpenStreetMap`,
                added: syncResult.addedCount,
                updated: syncResult.updatedCount,
                total: syncResult.courts.length
            });
        } else {
            res.json({ message: 'No courts found in this area', total: 0 });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all courts
app.get('/api/courts', (req, res) => {
    try {
        cleanExpiredReservations();
        const result = db.exec(`
            SELECT c.*, 
                   (
                       SELECT COUNT(*)
                       FROM reservations r
                       WHERE r.court_id = c.id
                         AND r.status = 'active'
                         AND datetime(r.start_time) <= datetime('now')
                         AND datetime(r.end_time) > datetime('now')
                   ) as active_reservations,
                   (
                       SELECT COUNT(*)
                       FROM reservations r
                       WHERE r.court_id = c.id
                         AND r.status = 'active'
                         AND datetime(r.start_time) > datetime('now')
                   ) as upcoming_reservations,
                   (
                       SELECT MIN(r.start_time)
                       FROM reservations r
                       WHERE r.court_id = c.id
                         AND r.status = 'active'
                         AND datetime(r.start_time) > datetime('now')
                   ) as next_reservation_start,
                   (SELECT COUNT(*) FROM waitlist w WHERE w.court_id = c.id AND w.status = 'waiting') as waitlist_count
            FROM courts c
            ORDER BY c.name ASC
        `);

        if (!result[0]) {
            return res.json([]);
        }

        const columns = result[0].columns;
        const courts = result[0].values.map(row => {
            const court = {};
            columns.forEach((col, i) => {
                court[col] = row[i];
            });
            return court;
        });

        res.json(courts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single court
app.get('/api/courts/:id', (req, res) => {
    try {
        const result = db.exec(`
            SELECT c.*, 
                   (
                       SELECT COUNT(*)
                       FROM reservations r
                       WHERE r.court_id = c.id
                         AND r.status = 'active'
                         AND datetime(r.start_time) <= datetime('now')
                         AND datetime(r.end_time) > datetime('now')
                   ) as active_reservations,
                   (
                       SELECT COUNT(*)
                       FROM reservations r
                       WHERE r.court_id = c.id
                         AND r.status = 'active'
                         AND datetime(r.start_time) > datetime('now')
                   ) as upcoming_reservations,
                   (
                       SELECT MIN(r.start_time)
                       FROM reservations r
                       WHERE r.court_id = c.id
                         AND r.status = 'active'
                         AND datetime(r.start_time) > datetime('now')
                   ) as next_reservation_start,
                   (SELECT COUNT(*) FROM waitlist w WHERE w.court_id = c.id AND w.status = 'waiting') as waitlist_count
            FROM courts c 
            WHERE c.id = ?
        `, [req.params.id]);

        if (!result[0] || result[0].values.length === 0) {
            return res.status(404).json({ error: 'Court not found' });
        }

        const columns = result[0].columns;
        const court = {};
        columns.forEach((col, i) => {
            court[col] = result[0].values[0][i];
        });

        res.json(court);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create reservation
app.post('/api/reservations', async (req, res) => {
    try {
        const { court_id, player_name, player_email, player_phone, number_of_players, duration_hours, passcode, start_time } = req.body;
        const normalizedPasscode = normalizePasscode(passcode);
        const normalizedDuration = Number(duration_hours);
        const reservationStart = parseReservationStartTime(start_time);

        // Validate input
        if (!court_id || !player_name || !normalizedDuration || !normalizedPasscode || !reservationStart) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (normalizedDuration > 2) {
            return res.status(400).json({ error: 'Maximum reservation is 2 hours' });
        }

        if (normalizedDuration <= 0) {
            return res.status(400).json({ error: 'Duration must be greater than 0' });
        }

        if (reservationStart.getTime() < Date.now()) {
            return res.status(400).json({ error: 'Reservation time must be in the future' });
        }

        const maxBookingTime = new Date();
        maxBookingTime.setDate(maxBookingTime.getDate() + MAX_BOOKING_WINDOW_DAYS);
        maxBookingTime.setHours(23, 59, 59, 999);

        if (reservationStart.getTime() > maxBookingTime.getTime()) {
            return res.status(400).json({ error: `Booking window is limited to the next ${MAX_BOOKING_WINDOW_DAYS} days` });
        }

        if (reservationStart.getSeconds() !== 0 || reservationStart.getMilliseconds() !== 0 || reservationStart.getMinutes() % 30 !== 0) {
            return res.status(400).json({ error: 'Reservations must start on a 30-minute slot' });
        }

        // Check cooldown
        if (player_email && isInCooldown(court_id, player_email)) {
            return res.status(400).json({ error: 'You must wait 1 hour before reserving the same court again' });
        }

        const startTime = reservationStart.toISOString();
        const endTime = new Date(reservationStart.getTime() + normalizedDuration * 60 * 60 * 1000).toISOString();

        // Check for conflicts
        const conflictResult = db.exec(`
            SELECT COUNT(*) FROM reservations 
            WHERE court_id = ? AND status = 'active' 
            AND datetime(start_time) < datetime(?)
            AND datetime(end_time) > datetime(?)
        `, [court_id, endTime, startTime]);

        if (conflictResult[0].values[0][0] > 0) {
            return res.status(400).json({ error: 'This slot is unavailable. Choose another time or day.' });
        }

        const id = uuidv4();

        // Generate QR Code
        const qrData = JSON.stringify({
            reservation_id: id,
            court_id: court_id,
            player_name: player_name,
            start_time: startTime,
            end_time: endTime
        });
        const qrCode = await QRCode.toDataURL(qrData);

        // Insert reservation
        db.run(`
            INSERT INTO reservations (id, court_id, player_name, player_email, player_phone, number_of_players, start_time, end_time, duration_hours, qr_code, passcode_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, court_id, player_name, player_email, player_phone, number_of_players || 2, startTime, endTime, normalizedDuration, qrCode, hashPasscode(normalizedPasscode)]);

        // Add cooldown
        if (player_email) {
            const cooldownId = uuidv4();
            const cooldownEnd = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour cooldown
            db.run(`
                INSERT INTO cooldowns (id, court_id, player_name, player_email, end_time)
                VALUES (?, ?, ?, ?, ?)
            `, [cooldownId, court_id, player_name, player_email, cooldownEnd]);
        }

        saveDatabase();

        res.json({
            id,
            qr_code: qrCode,
            start_time: startTime,
            end_time: endTime,
            message: 'Reservation created successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get reservations for a court
app.get('/api/courts/:id/reservations', (req, res) => {
    try {
        cleanExpiredReservations();
        const result = db.exec(`
            SELECT
                id,
                court_id,
                player_name,
                player_email,
                player_phone,
                number_of_players,
                start_time,
                end_time,
                duration_hours,
                status,
                qr_code,
                created_at,
                CASE WHEN COALESCE(passcode_hash, '') <> '' THEN 1 ELSE 0 END as has_passcode
            FROM reservations 
            WHERE court_id = ? AND status = 'active'
            ORDER BY start_time ASC
        `, [req.params.id]);

        if (!result[0]) {
            return res.json([]);
        }

        const columns = result[0].columns;
        const reservations = result[0].values.map(row => {
            const reservation = {};
            columns.forEach((col, i) => {
                reservation[col] = row[i];
            });
            return reservation;
        });

        res.json(reservations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/reservations/:id', (req, res) => {
    try {
        const normalizedPasscode = normalizePasscode(req.body?.passcode);

        if (!normalizedPasscode) {
            return res.status(400).json({ error: 'Passcode is required' });
        }

        const result = db.exec(`
            SELECT id, passcode_hash
            FROM reservations
            WHERE id = ? AND status = 'active'
        `, [req.params.id]);

        if (!result[0]?.values?.[0]) {
            return res.status(404).json({ error: 'Active reservation not found' });
        }

        const [, passcodeHash] = result[0].values[0];

        if (!passcodeHash) {
            return res.status(400).json({ error: 'This reservation does not support online cancellation' });
        }

        if (!verifyPasscode(normalizedPasscode, passcodeHash)) {
            return res.status(403).json({ error: 'Invalid passcode' });
        }

        db.run("UPDATE reservations SET status = 'cancelled' WHERE id = ?", [req.params.id]);
        saveDatabase();

        res.json({ message: 'Reservation cancelled successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Join waitlist
app.post('/api/waitlist', (req, res) => {
    try {
        const { court_id, player_name, player_email, player_phone, number_of_players, preferred_date, preferred_time, duration_hours } = req.body;

        if (!court_id || !player_name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get next position
        const maxPosResult = db.exec(`
            SELECT MAX(position) as max_pos FROM waitlist 
            WHERE court_id = ? AND status = 'waiting'
        `, [court_id]);
        const position = (maxPosResult[0].values[0][0] || 0) + 1;

        const id = uuidv4();
        db.run(`
            INSERT INTO waitlist (id, court_id, player_name, player_email, player_phone, number_of_players, preferred_date, preferred_time, duration_hours, position)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, court_id, player_name, player_email, player_phone, number_of_players || 2, preferred_date, preferred_time, duration_hours || 1, position]);

        saveDatabase();

        res.json({ id, position, message: 'Added to waitlist successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get waitlist for a court
app.get('/api/courts/:id/waitlist', (req, res) => {
    try {
        const result = db.exec(`
            SELECT * FROM waitlist 
            WHERE court_id = ? AND status = 'waiting'
            ORDER BY position ASC
        `, [req.params.id]);

        if (!result[0]) {
            return res.json([]);
        }

        const columns = result[0].columns;
        const waitlist = result[0].values.map(row => {
            const entry = {};
            columns.forEach((col, i) => {
                entry[col] = row[i];
            });
            return entry;
        });

        res.json(waitlist);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove from waitlist
app.delete('/api/waitlist/:id', (req, res) => {
    try {
        db.run("UPDATE waitlist SET status = 'removed' WHERE id = ?", [req.params.id]);
        saveDatabase();
        res.json({ message: 'Removed from waitlist' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check cooldown status
app.get('/api/cooldown/:courtId/:email', (req, res) => {
    try {
        const { courtId, email } = req.params;
        const result = db.exec(`
            SELECT * FROM cooldowns 
            WHERE court_id = ? AND player_email = ? AND end_time > datetime('now')
        `, [courtId, email]);

        if (result[0] && result[0].values.length > 0) {
            const columns = result[0].columns;
            const cooldown = {};
            columns.forEach((col, i) => {
                cooldown[col] = result[0].values[0][i];
            });
            res.json({ in_cooldown: true, cooldown_end: cooldown.end_time });
        } else {
            res.json({ in_cooldown: false, cooldown_end: null });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        db_path: DB_PATH
    });
});

// Serve React app for any other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Clean expired reservations every minute
cron.schedule('* * * * *', () => {
    cleanExpiredReservations();
});

// Initialize database and start server
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`API available at http://localhost:${PORT}/api`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
