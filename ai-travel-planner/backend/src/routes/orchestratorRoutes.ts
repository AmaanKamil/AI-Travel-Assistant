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
