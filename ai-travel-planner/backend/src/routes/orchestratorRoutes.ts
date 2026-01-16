import { Router } from 'express';
import { handleUserInput } from '../orchestrator/orchestrator';

const router = Router();

import { handleError } from '../utils/errorHandler';

import { generateSpeech } from '../services/ttsService';

router.post('/orchestrate', async (req, res) => {
    try {
        const { sessionId, transcript } = req.body;

        if (!sessionId || !transcript) {
            res.status(400).json({ error: "Missing sessionId or transcript" });
            return;
        }

        const response = await handleUserInput(sessionId, transcript);

        // Generate Voice Audio
        let audioData = null;
        if (response.message) {
            audioData = await generateSpeech(response.message);
        }

        res.json({ ...response, audio: audioData });
    } catch (error) {
        const appError = handleError(error, 'API: /orchestrate');
        res.status(500).json({ error: appError.userMessage });
    }
});

import { generatePDF } from '../services/pdfService';
import { emailService } from '../services/emailService';

// import { parseEditIntent, applyEdit } from '../services/editEngine';
import { getSession, saveSession } from '../orchestrator/sessionContext';

/*
router.post('/edit-itinerary', async (req, res) => {
    // ... Deprecated ...
    res.status(410).json({ message: "Use /api/edit" });
});
*/


// /export-itinerary removed in favor of /send-itinerary-email

// CONSOLIDATED EMAIL ENDPOINT
router.post('/send-itinerary-email', async (req, res) => {
    const { email, itinerary } = req.body;

    // STEP 1: Strict Validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        res.status(400).json({ success: false, message: "Please provide a valid email address." });
        return;
    }
    if (!itinerary || !itinerary.days || itinerary.days.length === 0) {
        res.status(400).json({ success: false, message: "Invalid itinerary data. Itinerary must have at least one day.", error: "ITINERARY_MISSING" });
        return;
    }

    // STEP 2: Respond Early (Async Flow)
    res.json({ success: true, status: "QUEUED" });

    // STEP 3: Async Execution (Detached Promise with background wait)
    setImmediate(async () => {
        try {
            console.log(`[ASYNC_JOB] Processing email for ${email}`);
            const pdfPath = await generatePDF(itinerary);

            // emailService.send handles provider check and logging internally
            const emailResult = await emailService.send(email, pdfPath);

            if (emailResult.success) {
                console.log(`[ASYNC_JOB] SUCCESS: Email delivered to ${email}`);
            } else {
                console.error(`[ASYNC_JOB] FAILURE: ${emailResult.message} to ${email}`);
            }
        } catch (err: any) {
            console.error(`[ASYNC_JOB] CRITICAL ERROR for ${email}:`, err.message);
        }
    });
});

export default router;
