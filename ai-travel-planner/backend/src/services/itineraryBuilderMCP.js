"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildItinerary = buildItinerary;
exports.buildItineraryEdit = buildItineraryEdit;
// Helper to identify "Iconic" POIs (Seeds or High Score)
var isIconic = function (poi) { var _a; return poi.score >= 50 || ((_a = poi.metadata) === null || _a === void 0 ? void 0 : _a.source) === 'Seed'; };
// --- VALIDATION HELPER ---
var sanitizeText = function (text) {
    if (!text)
        return null;
    if (/[\u0600-\u06FF]/.test(text))
        return null;
    if (text.toLowerCase().includes('unknown'))
        return null;
    return text;
};
// --- VALIDATION HELPER ---
var isValidPOI = function (poi) {
    if (!poi || !poi.name)
        return false;
    if (!sanitizeText(poi.name))
        return false;
    // 1. Required Fields
    if (!poi.category || !poi.location || !poi.location.lat || !poi.location.lng)
        return false;
    return true;
};
// --- TIMING HELPERS ---
var haversineDistance = function (lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = (lat2 - lat1) * (Math.PI / 180);
    var dLon = (lon2 - lon1) * (Math.PI / 180);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};
var estimateTravelTime = function (prevLoc, currLoc) {
    if (!prevLoc || !currLoc)
        return "Travel time varies";
    var dist = haversineDistance(prevLoc.lat, prevLoc.lng, currLoc.lat, currLoc.lng);
    // Assume average city speed 30km/h
    var timeInHours = dist / 30;
    var timeInMins = Math.round(timeInHours * 60);
    if (timeInMins < 5)
        return "5 mins walk";
    if (timeInMins < 15)
        return "".concat(timeInMins, " mins taxi");
    return "".concat(timeInMins, " mins travel");
};
var getDuration = function (category, pace) {
    var cat = category.toLowerCase();
    // UPDATED LOGIC per User Request
    if (cat.includes('landmark') || cat.includes('sight'))
        return '90 mins';
    if (cat.includes('mall') || cat.includes('souk'))
        return '120 mins';
    if (cat.includes('museum'))
        return '90 mins';
    if (cat.includes('cafe'))
        return '45 mins';
    if (cat.includes('theme park'))
        return '4 hours';
    if (cat.includes('beach'))
        return '3 hours';
    return '90 mins'; // Default
};
function buildItinerary(pois_1, days_1) {
    return __awaiter(this, arguments, void 0, function (pois, days, pace) {
        var validPOIs, plans, usedPOI_IDs, ZONES, getZoneForDay, _loop_1, i, tripHasCultural;
        if (pace === void 0) { pace = 'medium'; }
        return __generator(this, function (_a) {
            console.log("[MCP: Builder] Building ".concat(days, "-day itinerary with ").concat(pois.length, " RAW POIs. Pace: ").concat(pace));
            validPOIs = pois.filter(function (p) { return sanitizeText(p.name) && isValidPOI(p); });
            plans = [];
            usedPOI_IDs = new Set();
            ZONES = ['Downtown', 'Old Dubai', 'Marina', 'Jumeirah', 'Other'];
            getZoneForDay = function (dayNum) { return ZONES[(dayNum - 1) % ZONES.length]; };
            _loop_1 = function (i) {
                var dailyBlocks = [];
                var targetZone = getZoneForDay(i);
                // Define Slots structure (Meal slots fixed)
                // Morning -> Lunch -> Afternoon -> Dinner -> Evening (optional)
                var timeConfigs = [
                    { time: 'Morning', type: 'activity', max: 1 },
                    { time: '12:30 PM', type: 'lunch', duration: '1h 30m', fixed: true },
                    { time: 'Afternoon', type: 'activity', max: pace === 'packed' ? 2 : 1 },
                    { time: '07:00 PM', type: 'dinner', duration: '2h', fixed: true },
                ];
                if (pace === 'packed') {
                    timeConfigs.push({ time: 'Late Evening', type: 'activity', max: 1 });
                }
                var lastLocation = null;
                var zonePOIs = validPOIs.filter(function (p) { return !usedPOI_IDs.has(p.id) && (p.location.zone === targetZone || (!p.location.zone && targetZone === 'Other')); });
                var fallbackPOIs = validPOIs.filter(function (p) { return !usedPOI_IDs.has(p.id) && p.location.zone !== targetZone; });
                for (var _i = 0, timeConfigs_1 = timeConfigs; _i < timeConfigs_1.length; _i++) {
                    var config = timeConfigs_1[_i];
                    // LUNCH SLOT
                    if (config.type === 'lunch') {
                        dailyBlocks.push({
                            time: config.time,
                            activity: "Lunch in ".concat(targetZone),
                            duration: config.duration,
                            description: "Enjoy local cuisine near your morning activities."
                        });
                        continue;
                    }
                    // DINNER SLOT
                    if (config.type === 'dinner') {
                        dailyBlocks.push({
                            time: config.time,
                            activity: "Dinner in ".concat(targetZone),
                            duration: config.duration,
                            description: "Dining experience in the ".concat(targetZone, " area.")
                        });
                        continue;
                    }
                    // ACTIVITY SLOTS
                    // Pick BEST available POI
                    var count = config.max || 1;
                    var _loop_2 = function (c) {
                        var selectedPOI = null;
                        // 1. Iconic in Zone
                        var iconicInZone = zonePOIs.find(function (p) { return isIconic(p); });
                        if (iconicInZone)
                            selectedPOI = iconicInZone;
                        // 2. Standard in Zone
                        else if (zonePOIs.length > 0)
                            selectedPOI = zonePOIs[0];
                        // 3. Fallback Iconic
                        else if (fallbackPOIs.some(function (p) { return isIconic(p); }))
                            selectedPOI = fallbackPOIs.find(function (p) { return isIconic(p); });
                        // 4. Fallback Any
                        else if (fallbackPOIs.length > 0)
                            selectedPOI = fallbackPOIs[0];
                        if (selectedPOI) {
                            var duration = getDuration(selectedPOI.category, pace);
                            var travelTime = dailyBlocks.length > 0 ? estimateTravelTime(lastLocation, selectedPOI.location) : "Start";
                            dailyBlocks.push({
                                time: "".concat(config.time).concat(count > 1 ? " (".concat(c + 1, ")") : ''),
                                activity: "Visit ".concat(selectedPOI.name),
                                duration: duration,
                                description: "Experience ".concat(selectedPOI.category, " in ").concat(selectedPOI.location.zone || 'Dubai', ". Travel: ").concat(travelTime, ".")
                            });
                            usedPOI_IDs.add(selectedPOI.id);
                            lastLocation = selectedPOI.location;
                            zonePOIs = zonePOIs.filter(function (p) { return p.id !== selectedPOI.id; });
                            fallbackPOIs = fallbackPOIs.filter(function (p) { return p.id !== selectedPOI.id; });
                        }
                        else {
                            // NO POI LEFT - Add filler check?
                            // If we really run out, maybe skip slot
                        }
                    };
                    for (var c = 0; c < count; c++) {
                        _loop_2(c);
                    }
                }
                plans.push({
                    day: i,
                    blocks: dailyBlocks
                });
            };
            for (i = 1; i <= days; i++) {
                _loop_1(i);
            }
            tripHasCultural = plans.some(function (d) { return d.blocks.some(function (b) { return /museum|souk|mosque|heritage|fahidi/i.test(b.activity); }); });
            if (!tripHasCultural && plans.length > 0) {
                // Insert at Day 1 Morning
                if (plans[0].blocks.length > 0 && plans[0].blocks[0].type !== 'lunch') {
                    plans[0].blocks[0] = {
                        time: 'Morning',
                        activity: 'Visit Dubai Museum & Al Fahidi Fort',
                        duration: '2 hours',
                        description: 'Dive into history. Cultural Mandate.'
                    };
                }
            }
            return [2 /*return*/, {
                    title: "Your ".concat(days, "-Day Dubai Adventure (").concat(pace, ")"),
                    days: plans
                }];
        });
    });
}
function buildItineraryEdit(original, intent) {
    return __awaiter(this, void 0, void 0, function () {
        var updated, dayIndex, dayPlan, removed;
        return __generator(this, function (_a) {
            console.log("[MCP: Builder] Editing itinerary... Intent: ".concat(intent.change_type, " on Day ").concat(intent.target_day));
            updated = JSON.parse(JSON.stringify(original));
            if (!intent.target_day)
                return [2 /*return*/, updated];
            dayIndex = updated.days.findIndex(function (d) { return d.day === intent.target_day; });
            if (dayIndex === -1)
                return [2 /*return*/, updated];
            dayPlan = updated.days[dayIndex];
            // Apply dummy logic based on change type
            // Apply logic based on change type
            if (intent.change_type === 'make_more_relaxed') {
                // STRICT LOGIC: Remove one activity (the last one usually) and add a "Relaxation" block
                if (dayPlan.blocks.length > 1) {
                    removed = dayPlan.blocks.pop();
                    console.log("[MCP: Builder] Removed activity: ".concat(removed === null || removed === void 0 ? void 0 : removed.activity, " to relax schedule."));
                    dayPlan.blocks.push({
                        time: 'Late Afternoon',
                        activity: 'Free Time & Relaxation',
                        duration: '2 hours'
                    });
                }
            }
            else if (intent.change_type === 'swap_activity') {
                // Just mock a swap
                dayPlan.blocks.forEach(function (block) {
                    if (!intent.target_block || block.time.toLowerCase().includes(intent.target_block.toLowerCase())) {
                        block.activity = "New " + block.activity + " (Swapped)";
                    }
                });
            }
            else if (intent.change_type === 'add_place') {
                dayPlan.blocks.push({
                    time: 'Late Night',
                    activity: 'Dessert at Global Village',
                    duration: '45 mins'
                });
            }
            // Pass back updated full object
            return [2 /*return*/, updated];
        });
    });
}
