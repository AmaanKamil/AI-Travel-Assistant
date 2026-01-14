"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSession = getSession;
exports.saveSession = saveSession;
exports.createNewSession = createNewSession;
var sessions = new Map();
function getSession(sessionId) {
    return sessions.get(sessionId);
}
function saveSession(context) {
    sessions.set(context.sessionId, context);
}
function createNewSession(sessionId) {
    var newContext = {
        sessionId: sessionId,
        currentState: 'IDLE',
        collectedConstraints: {},
        constraintsCollected: false,
        planGenerated: false,
        clarificationCount: 0
    };
    sessions.set(sessionId, newContext);
    return newContext;
}
