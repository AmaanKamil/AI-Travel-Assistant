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

import { generateItineraryPDF } from '../services/pdfService';
import { sendItineraryEmail } from '../services/emailService';

import { parseEditIntent, applyEdit } from '../services/editEngine';
import { getSession, saveSession } from '../orchestrator/sessionContext';

router.post('/edit-itinerary', async (req, res) => {
    try {
        const { sessionId, editCommand } = req.body;
        console.log(`[API] edit_request_received for Session: ${sessionId}`);

        if (!sessionId || !editCommand) {
            res.status(400).json({ status: 'error', message: "Missing sessionId or editCommand" });
            return;
        }

        // 1. Load Session
        const context = getSession(sessionId);
        if (!context || !context.itinerary) {
            console.log(`[API] No itinerary found for session ${sessionId}`);
            res.status(400).json({ status: 'error', message: "Let's create a trip plan first before editing it." });
            return;
        }
        console.log(`[API] itinerary_loaded for Session: ${sessionId}`);

        // 2. Parse Intent
        const intent = parseEditIntent(editCommand);
        console.log(`[API] edit_intent_parsed: ${intent.type} on Day ${intent.targetDay}`);

        if (intent.type === 'unknown') {
            res.json({ status: 'error', message: "I couldn't understand what you want to change. Try saying for example: Make Day 2 more relaxed." });
            return;
        }

        // 3. Apply Edit
        const result = applyEdit(context.itinerary, intent);
        console.log(`[API] edit_applied: Success=${result.success}`);

        if (result.success && result.updatedItinerary) {
            // 4. Save Session
            context.itinerary = result.updatedItinerary;
            saveSession(context);
            console.log(`[API] itinerary_saved for Session: ${sessionId}`);

            // 5. Generate Audio (Optional/Helper)
            let audioData = null;
            if (result.message) {
                audioData = await generateSpeech(result.message);
            }

            console.log(`[API] response_sent`);
            res.json({
                status: 'success',
                updatedItinerary: result.updatedItinerary,
                message: result.message,
                audio: audioData
            });
        } else {
            res.json({ status: 'error', message: result.message });
        }

    } catch (error) {
        const appError = handleError(error, 'API: /edit-itinerary');
        res.status(500).json({ status: 'error', message: appError.userMessage });
    }
});


router.post('/export-itinerary', async (req, res) => {
    try {
        const { itinerary, userEmail } = req.body;

        if (!itinerary || !userEmail) {
            res.status(400).json({ error: "Missing itinerary or userEmail" });
            return;
        }

        console.log(`[API] Exporting itinerary for ${userEmail}`);

        // Generate PDF
        let pdfBuffer;
        try {
            pdfBuffer = await generateItineraryPDF(itinerary);
        } catch (pdfError) {
            const appError = handleError(pdfError, 'PDF Generation');
            res.status(500).json({ error: "I couldn't generate the PDF right now. Your plan is still safe." });
            return;
        }

        // Send Email
        try {
            await sendItineraryEmail(userEmail, pdfBuffer);
        } catch (emailError) {
            const appError = handleError(emailError, 'Email Sending');
            res.status(500).json({ error: "I created your itinerary, but I couldn't send the email. You can try again later." });
            return;
        }

        res.json({ status: 'success', message: 'Your itinerary has been sent to your email.' });

    } catch (error: any) {
        const appError = handleError(error, 'API: /export-itinerary');
        res.status(500).json({ error: appError.userMessage });
    }
});

export default router;
