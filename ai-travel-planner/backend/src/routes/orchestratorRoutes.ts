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
        return res.status(400).json({ success: false, message: "Please provide a valid email address." });
    }
    if (!itinerary || !itinerary.days || itinerary.days.length === 0) {
        return res.status(400).json({ success: false, message: "Invalid itinerary data. Itinerary must have at least one day.", error: "ITINERARY_MISSING" });
    }

    try {
        console.log(`[API] Processing email delivery for ${email}`);

        // Step 2: Generate PDF
        console.log(`[API] Generating PDF...`);
        const pdfPath = await generatePDF(itinerary);
        console.log(`[API] PDF generated at ${pdfPath}`);

        // Step 3: Await and validate sendMail response (No fake success)
        console.log(`[API] Sending email via Nodemailer...`);
        const emailResult = await emailService.send(email, pdfPath);

        if (emailResult.success) {
            console.log(`[API] SUCCESS: Email accepted by Gmail for ${email}`);
            return res.json({ success: true });
        } else {
            console.error(`[API] FAILURE: ${emailResult.message} for ${email}`);
            // Use 502 for provider failure
            return res.status(502).json({
                success: false,
                error: emailResult.message
            });
        }
    } catch (err: any) {
        console.error(`[API] CRITICAL ERROR during email flow:`, err.message);
        console.error(err.stack);
        return res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR", details: err.message });
    }
});

export default router;
