"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPOIs = searchPOIs;
var node_fetch_1 = __importDefault(require("node-fetch"));
var errorHandler_1 = require("../utils/errorHandler");
var DUBAI_TOP_10_SEEDS = [
    { id: 'seed-1', name: 'Burj Khalifa', category: 'attraction', estimated_visit_duration_minutes: 120, location: { lat: 25.1972, lng: 55.2744, zone: 'Downtown' }, metadata: { description: 'The tallest building in the world.', source: 'Seed', indoor: true, best_time: 'evening' } },
    { id: 'seed-2', name: 'The Dubai Mall', category: 'attraction', estimated_visit_duration_minutes: 180, location: { lat: 25.1988, lng: 55.2796, zone: 'Downtown' }, metadata: { description: 'World\'s largest shopping mall.', source: 'Seed', indoor: true, best_time: 'afternoon' } },
    { id: 'seed-3', name: 'Dubai Fountain', category: 'attraction', estimated_visit_duration_minutes: 30, location: { lat: 25.197, lng: 55.27, zone: 'Downtown' }, metadata: { description: 'World\'s largest choreographed fountain system.', source: 'Seed', indoor: false, best_time: 'evening' } },
    { id: 'seed-4', name: 'Palm Jumeirah', category: 'landmark', estimated_visit_duration_minutes: 120, location: { lat: 25.1124, lng: 55.1390, zone: 'Marina' }, metadata: { description: 'Iconic palm-shaped artificial island.', source: 'Seed', indoor: false, best_time: 'morning' } },
    { id: 'seed-5', name: 'Al Fahidi Historical District', category: 'historic_site', estimated_visit_duration_minutes: 90, location: { lat: 25.2630, lng: 55.3003, zone: 'Old Dubai' }, metadata: { description: 'Traditional heritage area.', source: 'Seed', indoor: false, best_time: 'morning' } },
    { id: 'seed-6', name: 'Dubai Creek', category: 'waterfront', estimated_visit_duration_minutes: 60, location: { lat: 25.26, lng: 55.30, zone: 'Old Dubai' }, metadata: { description: 'Historic saltwater creek.', source: 'Seed', indoor: false, best_time: 'evening' } },
    { id: 'seed-7', name: 'Jumeirah Mosque', category: 'mosque', estimated_visit_duration_minutes: 45, location: { lat: 25.2336, lng: 55.2778, zone: 'Jumeirah' }, metadata: { description: 'Famous mosque open to non-Muslims.', source: 'Seed', indoor: true, best_time: 'morning' } },
    { id: 'seed-8', name: 'Souk Madinat Jumeirah', category: 'souk', estimated_visit_duration_minutes: 90, location: { lat: 25.133, lng: 55.185, zone: 'Jumeirah' }, metadata: { description: 'Modern souk with traditional vibe.', source: 'Seed', indoor: true, best_time: 'evening' } },
    { id: 'seed-9', name: 'Burj Al Arab', category: 'landmark', estimated_visit_duration_minutes: 60, location: { lat: 25.1412, lng: 55.1853, zone: 'Jumeirah' }, metadata: { description: 'Luxury hotel icon.', source: 'Seed', indoor: true, best_time: 'afternoon' } },
    { id: 'seed-10', name: 'Desert Safari', category: 'desert_experience', estimated_visit_duration_minutes: 240, location: { lat: 24.8, lng: 55.5, zone: 'Desert' }, metadata: { description: 'Dune bashing and dinner.', source: 'Seed', indoor: false, best_time: 'evening' } }
];
function searchPOIs(interests, constraints) {
    return __awaiter(this, void 0, void 0, function () {
        var OVERPASS_API_URL, query, response, data, elements, osmPOIs, allPOIs, scoredPOIs, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("[MCP: POI Search] Searching for interests: ".concat(interests.join(', ')));
                    OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
                    query = "\n        [out:json];\n        (\n          node[\"tourism\"=\"museum\"](24.8,54.9,25.4,55.6);\n          node[\"tourism\"=\"attraction\"](24.8,54.9,25.4,55.6);\n          node[\"historic\"](24.8,54.9,25.4,55.6);\n          node[\"tourism\"=\"viewpoint\"](24.8,54.9,25.4,55.6);\n          node[\"leisure\"=\"park\"](24.8,54.9,25.4,55.6);\n        );\n        out center 100;\n    ";
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, (0, node_fetch_1.default)(OVERPASS_API_URL, {
                            method: 'POST',
                            body: query,
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                        })];
                case 2:
                    response = _a.sent();
                    if (!response.ok)
                        throw new Error("Overpass API Error: ".concat(response.statusText));
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    elements = data.elements || [];
                    osmPOIs = elements
                        .map(function (el) { return normalizePOI(el); })
                        .filter(function (poi) { return poi !== null; });
                    allPOIs = __spreadArray(__spreadArray([], DUBAI_TOP_10_SEEDS, true), osmPOIs, true);
                    scoredPOIs = allPOIs.map(function (poi) { return (__assign(__assign({}, poi), { score: calculateRelevance(poi, interests) })); }).sort(function (a, b) { return b.score - a.score; });
                    console.log("[MCP: POI Search] Returned ".concat(scoredPOIs.length, " valid POIs."));
                    return [2 /*return*/, scoredPOIs];
                case 4:
                    error_1 = _a.sent();
                    (0, errorHandler_1.handleError)(error_1, 'POI Search');
                    return [2 /*return*/, DUBAI_TOP_10_SEEDS]; // Fail safe to seeds
                case 5: return [2 /*return*/];
            }
        });
    });
}
function calculateRelevance(poi, interests) {
    var score = 10; // Base score
    // 1. Seed Bonus
    if (poi.metadata.source === 'Seed')
        score += 50;
    // 2. Category Bonus
    if (['attraction', 'landmark'].includes(poi.category))
        score += 20;
    if (['museum', 'historic_site', 'souk'].includes(poi.category))
        score += 15;
    if (['theme_park', 'waterfront'].includes(poi.category))
        score += 10;
    // 3. Name Relevance (Simple Keyword Match)
    if (interests.some(function (int) { return poi.name.toLowerCase().includes(int.toLowerCase()); })) {
        score += 30;
    }
    if (interests.some(function (int) { return poi.category.toLowerCase().includes(int.toLowerCase()); })) {
        score += 15;
    }
    // 4. Penalties for Generics if not caught by filter
    if (poi.name.toLowerCase().includes("office") || poi.name.toLowerCase().includes("store")) {
        score -= 50;
    }
    return score;
}
function normalizePOI(el) {
    var tags = el.tags || {};
    var name = tags.name || tags['name:en'] || 'Unknown';
    // --- 1. HARD EXCLUSION RULES ---
    var BLOCKED_KEYWORDS = [
        'school', 'university', 'college', 'kindergarten',
        'hospital', 'clinic', 'medical', 'dental', 'pharmacy',
        'police', 'station', 'fire',
        'parking', 'garage',
        'office', 'admin', 'headquarters',
        'residence', 'apartment', 'villa',
        'supermarket', 'grocery', 'hypermarket',
        'pizza hut', 'mcdonald', 'kfc', 'subway', 'burger king', 'starbucks', 'costa', 'tim hortons', 'domino'
    ];
    if (BLOCKED_KEYWORDS.some(function (kw) { return name.toLowerCase().includes(kw); })) {
        return null; // DROP IMMEDIATELY
    }
    // --- 2. CATEGORY ALLOWLIST ---
    var category = 'other';
    if (tags.tourism === 'museum')
        category = 'museum';
    else if (tags.tourism === 'attraction')
        category = 'attraction';
    else if (tags.tourism === 'viewpoint')
        category = 'viewpoint';
    else if (tags.tourism === 'theme_park')
        category = 'theme_park';
    else if (tags.tourism === 'gallery')
        category = 'museum'; // Group galleries
    else if (tags.historic || tags.heritage)
        category = 'historic_site';
    else if (tags.leisure === 'park')
        category = 'park';
    else if (name.toLowerCase().includes('souk'))
        category = 'souk';
    else if (name.toLowerCase().includes('beach'))
        category = 'beach';
    else if (name.toLowerCase().includes('mall'))
        category = 'mall';
    else if (name.toLowerCase().includes('mosque'))
        category = 'mosque';
    var ALLOWED_CATEGORIES = ['museum', 'attraction', 'viewpoint', 'theme_park', 'historic_site', 'park', 'souk', 'beach', 'mall', 'mosque', 'landmark', 'waterfront', 'desert_experience'];
    if (!ALLOWED_CATEGORIES.includes(category)) {
        return null; // DROP IF NOT ALLOWED
    }
    // Heuristics
    var isIndoor = ['museum', 'mall', 'souk', 'mosque'].includes(category);
    var bestTime = isIndoor ? 'afternoon' : 'evening'; // Default logic
    var duration = 60;
    if (category === 'museum')
        duration = 90;
    if (category === 'theme_park')
        duration = 240;
    var zone = determineZone(el.lat, el.lon);
    return {
        id: "osm-".concat(el.id),
        name: name,
        category: category,
        estimated_visit_duration_minutes: duration,
        location: { lat: el.lat, lng: el.lon, zone: zone },
        metadata: {
            description: "A ".concat(category, " in ").concat(zone, ", Dubai."),
            source: 'OpenStreetMap',
            indoor: isIndoor,
            best_time: bestTime
        }
    };
}
function determineZone(lat, lng) {
    // Simple Lat/Lng Boxes for Dubai
    // Downtown: ~25.19, 55.27
    if (lat > 25.18 && lat < 25.21 && lng > 55.26 && lng < 55.29)
        return 'Downtown';
    // Old Dubai (Deira/Bur Dubai): ~25.26, 55.30
    if (lat > 25.24 && lat < 25.29 && lng > 55.28 && lng < 55.35)
        return 'Old Dubai';
    // Marina / JBR / Palm: ~25.07, 55.14
    if (lat > 25.06 && lat < 25.14 && lng < 55.17)
        return 'Marina';
    // Jumeirah (Coastal Strip): ~25.13 to 25.23
    if (lat >= 25.13 && lat <= 25.24 && lng >= 55.17 && lng <= 55.28)
        return 'Jumeirah';
    return 'Other';
}
