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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.handleUserInput = handleUserInput;
var sessionContext_1 = require("./sessionContext");
var llmService_1 = require("../services/llmService");
var poiSearchMCP_1 = require("../services/poiSearchMCP");
var itineraryBuilderMCP_1 = require("../services/itineraryBuilderMCP");
var ragService_1 = require("../services/ragService");
var editEngine_1 = require("../services/editEngine");
var postPlanRouter_1 = require("./postPlanRouter");
var explainService_1 = require("../services/explainService");
var editEngine = __importStar(require("../services/editEngineWrapper"));
var pdfService_1 = require("../services/pdfService");
var emailService_1 = require("../services/emailService");
var REQUIRED_FIELDS = ['days', 'pace', 'interests'];
function getMissingField(ctx) {
    for (var _i = 0, REQUIRED_FIELDS_1 = REQUIRED_FIELDS; _i < REQUIRED_FIELDS_1.length; _i++) {
        var f = REQUIRED_FIELDS_1[_i];
        if (!ctx.collectedConstraints[f])
            return f;
    }
    return null;
}
function nextClarifyingQuestion(field) {
    switch (field) {
        case 'days':
            return 'How many days are you planning to stay in Dubai?';
        case 'pace':
            return 'Do you prefer a relaxed or packed schedule?';
        case 'interests':
            return 'What kind of experiences do you enjoy? For example food, culture, shopping, adventure.';
        default:
            return '';
    }
}
function handleUserInput(sessionId, userInput) {
    return __awaiter(this, void 0, void 0, function () {
        var ctx, nonAsciiCount, text, answer, updated, targetEmail, pdfPath, e_1, intent, command, editIntent, dayMatch, updated, missing, pois, itinerary, rag;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    ctx = (0, sessionContext_1.getSession)(sessionId) || (0, sessionContext_1.createNewSession)(sessionId);
                    nonAsciiCount = (userInput.match(/[^\x00-\x7F]/g) || []).length;
                    if (nonAsciiCount > userInput.length * 0.2) {
                        return [2 /*return*/, {
                                message: 'I’m a Dubai travel planning assistant. I can help you plan a 2 to 4 day trip to Dubai.',
                                currentState: ctx.currentState
                            }];
                    }
                    // Short-circuit for very obvious unrelated non-travel spam if needed,
                    // but strict "Dubai" keyword check might be too aggressive for "yes"/"no" answers.
                    // We will rely on the prompt to handle "Write me a poem" but we can block known jailbreaks or gibberish here.
                    if (userInput.length > 500) {
                        return [2 /*return*/, {
                                message: 'That message is a bit too long. Could you summarize your request?',
                                currentState: ctx.currentState
                            }];
                    }
                    console.log('[FLOW]', 'STATE:', ctx.currentState, 'PLAN:', ctx.planGenerated);
                    if (!ctx.planGenerated) return [3 /*break*/, 10];
                    text = userInput.toLowerCase();
                    console.log('[POST PLAN MODE] Incoming:', text);
                    if (!text.includes('why')) return [3 /*break*/, 2];
                    console.log('→ Routing to EXPLAIN');
                    return [4 /*yield*/, explainService_1.explainService.explainPlace(text, ctx.itinerary)];
                case 1:
                    answer = _b.sent();
                    return [2 /*return*/, {
                            message: answer,
                            currentState: 'READY'
                        }];
                case 2:
                    if (!(text.includes('change') ||
                        text.includes('edit') ||
                        text.includes('make') ||
                        text.includes('swap') ||
                        text.includes('remove') ||
                        text.includes('add'))) return [3 /*break*/, 4];
                    console.log('→ Routing to EDIT');
                    return [4 /*yield*/, editEngine.applyEdit(text, ctx.itinerary // Itinerary must exist if planGenerated is true
                        )];
                case 3:
                    updated = _b.sent();
                    ctx.itinerary = updated;
                    return [2 /*return*/, {
                            message: 'I’ve updated your itinerary.',
                            itinerary: updated,
                            currentState: 'READY'
                        }];
                case 4:
                    if (!(text.includes('email') ||
                        text.includes('send') ||
                        text.includes('pdf'))) return [3 /*break*/, 9];
                    console.log('→ Routing to EXPORT');
                    _b.label = 5;
                case 5:
                    _b.trys.push([5, 8, , 9]);
                    targetEmail = ctx.userEmail || (text.match(/[\w.-]+@[\w.-]+\.\w+/) || [])[0];
                    if (!targetEmail) {
                        return [2 /*return*/, {
                                message: 'What email address should I send it to?',
                                currentState: 'READY'
                            }];
                    }
                    return [4 /*yield*/, pdfService_1.pdfService.generate(ctx.itinerary)];
                case 6:
                    pdfPath = _b.sent();
                    return [4 /*yield*/, emailService_1.emailService.send(targetEmail, pdfPath)];
                case 7:
                    _b.sent();
                    return [2 /*return*/, {
                            message: 'I’ve emailed your itinerary to you.',
                            currentState: 'READY'
                        }];
                case 8:
                    e_1 = _b.sent();
                    console.error('EXPORT FAILED', e_1);
                    return [2 /*return*/, {
                            message: 'I couldn’t send the email. Please try again.',
                            currentState: 'READY'
                        }];
                case 9: 
                // ---- DEFAULT POST PLAN ----
                return [2 /*return*/, {
                        message: 'You can ask me to explain, edit, or email your itinerary.',
                        currentState: 'READY'
                    }];
                case 10: return [4 /*yield*/, (0, llmService_1.extractIntent)(userInput, ctx.currentState)];
                case 11:
                    intent = _b.sent();
                    console.log("[Orchestrator] Session: ".concat(sessionId, " | State: ").concat(ctx.currentState, " | Intent: ").concat(intent.type));
                    console.log("[Orchestrator] Session: ".concat(sessionId, " | State: ").concat(ctx.currentState, " | Intent: ").concat(intent.type));
                    // -------------------
                    // POST-PLAN ROUTER
                    // -------------------
                    if (ctx.planGenerated && ctx.currentState === 'READY') {
                        command = (0, postPlanRouter_1.routePostPlanCommand)(userInput);
                        console.log('[POST PLAN CMD]', command);
                        if (command === 'EXPLAIN') {
                            ctx.currentState = 'EXPLAINING';
                        }
                        if (command === 'EDIT') {
                            ctx.currentState = 'EDITING';
                        }
                        if (command === 'EXPORT') {
                            ctx.currentState = 'EXPORTING';
                        }
                        (0, sessionContext_1.saveSession)(ctx);
                    }
                    // -------------------
                    // SYSTEM BOOT (First Load)
                    // -------------------
                    if (intent.type === 'SYSTEM_BOOT') {
                        ctx.currentState = 'COLLECTING_INFO';
                        (0, sessionContext_1.saveSession)(ctx);
                        return [2 /*return*/, {
                                message: 'Hi, I’m your Dubai travel assistant. Tell me about your trip.',
                                currentState: 'COLLECTING_INFO'
                            }];
                    }
                    if (!(ctx.currentState === 'EDITING')) return [3 /*break*/, 13];
                    if (!ctx.itinerary) {
                        return [2 /*return*/, {
                                message: 'Let’s create your trip plan first before editing it.',
                                currentState: ctx.currentState,
                            }];
                    }
                    editIntent = {
                        change: 'relax', // Fallback, real implementation should use LLM or regex from user input if routePostPlanCommand identified it
                        day: 2
                    };
                    // Better: Use LLM intent if available, otherwise heuristic
                    if (intent.type === 'edit_itinerary' && intent.editIntent) {
                        Object.assign(editIntent, intent.editIntent);
                    }
                    else {
                        // Heuristic fallback matching previous logic
                        if (userInput.toLowerCase().includes('relax'))
                            editIntent.change = 'relax';
                        dayMatch = userInput.match(/day (\d+)/i);
                        if (dayMatch)
                            editIntent.day = parseInt(dayMatch[1]);
                    }
                    return [4 /*yield*/, (0, editEngine_1.applyDeterministicEdit)(ctx.itinerary, editIntent)];
                case 12:
                    updated = _b.sent();
                    ctx.itinerary = updated;
                    ctx.currentState = 'READY';
                    (0, sessionContext_1.saveSession)(ctx);
                    return [2 /*return*/, {
                            message: 'I’ve updated your itinerary.',
                            itinerary: updated,
                            currentState: 'READY',
                        }];
                case 13:
                    // -------------------
                    // EXPORT FLOW
                    // -------------------
                    // -------------------
                    // EXPORT FLOW
                    // -------------------
                    if (ctx.currentState === 'EXPORTING') {
                        ctx.currentState = 'READY';
                        (0, sessionContext_1.saveSession)(ctx);
                        // Placeholder for pdfService/emailService as requested
                        // Using existing logic for now
                        return [2 /*return*/, {
                                message: 'I’ve emailed your itinerary to you.',
                                currentState: 'READY',
                            }];
                    }
                    // -------------------
                    // PLANNING FLOW
                    // -------------------
                    if (intent.type === 'plan_trip' || ctx.currentState === 'IDLE' || ctx.currentState === 'READY') { // Added READY -> COLLECTING trigger if plan_trip
                        if (intent.type === 'plan_trip') {
                            ctx.currentState = 'COLLECTING_INFO';
                            (0, sessionContext_1.saveSession)(ctx);
                        }
                    }
                    // Merge entities if present (important for one-shot "3 days relaxed")
                    if (intent.entities) {
                        ctx.collectedConstraints = __assign(__assign({}, ctx.collectedConstraints), intent.entities);
                    }
                    if (ctx.currentState === 'COLLECTING_INFO') {
                        // Prevent re-entry if already done, unless explicit change requested
                        if (ctx.constraintsCollected && intent.type !== 'CHANGE_PREFERENCES') {
                            ctx.currentState = 'CONFIRMING';
                            // Fall through to confirming logic below
                        }
                        else {
                            missing = getMissingField(ctx);
                            if (missing) {
                                return [2 /*return*/, {
                                        message: nextClarifyingQuestion(missing),
                                        currentState: 'COLLECTING_INFO',
                                    }];
                            }
                            // All fields collected
                            ctx.constraintsCollected = true;
                            ctx.currentState = 'CONFIRMING';
                            (0, sessionContext_1.saveSession)(ctx);
                            return [2 /*return*/, {
                                    message: "I understand you want a ".concat(ctx.collectedConstraints.days, "-day trip to Dubai, focused on ").concat((_a = ctx.collectedConstraints.interests) === null || _a === void 0 ? void 0 : _a.join(', '), ", at a ").concat(ctx.collectedConstraints.pace, " pace. Should I generate the plan?"),
                                    currentState: 'CONFIRMING',
                                }];
                        }
                    }
                    if (!(ctx.currentState === 'CONFIRMING')) return [3 /*break*/, 17];
                    if (ctx.planGenerated) {
                        ctx.currentState = 'READY';
                        (0, sessionContext_1.saveSession)(ctx);
                        return [2 /*return*/, {
                                message: 'Your itinerary is ready. You can edit it or ask questions.',
                                itinerary: ctx.itinerary,
                                currentState: 'READY'
                            }];
                    }
                    if (!(intent.type === 'CONFIRM_GENERATE')) return [3 /*break*/, 16];
                    ctx.currentState = 'PLANNING';
                    (0, sessionContext_1.saveSession)(ctx);
                    return [4 /*yield*/, (0, poiSearchMCP_1.searchPOIs)(ctx.collectedConstraints.interests || [], [])];
                case 14:
                    pois = _b.sent();
                    return [4 /*yield*/, (0, itineraryBuilderMCP_1.buildItinerary)(pois, Number(ctx.collectedConstraints.days) || 3, ctx.collectedConstraints.pace || 'medium')];
                case 15:
                    itinerary = _b.sent();
                    ctx.itinerary = itinerary;
                    ctx.planGenerated = true;
                    ctx.currentState = 'READY';
                    (0, sessionContext_1.saveSession)(ctx);
                    return [2 /*return*/, {
                            message: 'Here is your Dubai itinerary.',
                            itinerary: itinerary,
                            currentState: 'READY'
                        }];
                case 16: return [2 /*return*/, {
                        message: 'Tell me if you’d like me to generate the plan, or change something.',
                        currentState: 'CONFIRMING'
                    }];
                case 17:
                    if (!(ctx.currentState === 'EXPLAINING')) return [3 /*break*/, 19];
                    return [4 /*yield*/, (0, ragService_1.getGroundedAnswer)(userInput)];
                case 18:
                    rag = _b.sent();
                    ctx.currentState = 'READY';
                    (0, sessionContext_1.saveSession)(ctx);
                    if (!rag || rag.sources.length === 0) {
                        return [2 /*return*/, {
                                message: 'I don’t yet have verified public data for this place.',
                                currentState: 'READY'
                            }];
                    }
                    return [2 /*return*/, {
                            message: rag.answer,
                            sources: rag.sources,
                            citations: rag.sources,
                            currentState: 'READY'
                        }];
                case 19:
                    (0, sessionContext_1.saveSession)(ctx);
                    console.log('[STATE END]', ctx.currentState, 'PLAN:', ctx.planGenerated);
                    // Fallback
                    return [2 /*return*/, {
                            message: 'Tell me how you’d like to continue.',
                            currentState: ctx.currentState,
                        }];
            }
        });
    });
}
