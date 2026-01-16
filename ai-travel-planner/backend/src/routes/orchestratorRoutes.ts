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

    // 1. Validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        res.status(400).json({ success: false, message: "Please provide a valid email address." });
        return;
    }
    if (!itinerary) {
        res.status(400).json({ success: false, message: "Missing itinerary data." });
        return;
    }

    // 2. Safe Execution
    try {
        console.log(`[API] Sending PDF to ${email}`);
        const pdfPath = await generatePDF(itinerary);

        // emailService.send is already safe (returns object, doesn't throw)
        const emailResult = await emailService.send(email, pdfPath);

        if (!emailResult.success) {
            // Logged internally, return clean error to UI
            // Return 200 with success:false to handle gracefully on client without axios throw?
            // User requested "No silent failures", "Return structured error".
            // Typically 400 or 500 is fine if body is structured. 
            // Let's stick to 200 for "Handled Failure" or strict 500 with message.
            // User requirement: "Return structured error... Never return empty 500".
            return res.status(200).json({ success: false, message: emailResult.message });
        }

        return res.json({ success: true, message: 'Your itinerary has been sent!' });

    } catch (err: any) {
        console.error("[API: Critical Email Error]", err);
        // Fallback for unexpected crashe (like PDF generation fail)
        return res.status(200).json({
            success: false,
            message: 'Could not generate PDF or send email. Please try again.'
        });
    }
});

export default router;
