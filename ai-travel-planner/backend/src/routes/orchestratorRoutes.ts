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


router.post('/export-itinerary', async (req, res) => {
    // Transactional Export Logic
    const { email, itinerary } = req.body;

    if (!email || !itinerary) {
        console.error("[API: Export] Missing email or itinerary payload.");
        res.status(400).json({ success: false, message: "Missing email or itinerary data." });
        return;
    }

    try {
        console.log(`[API: Export] Generating PDF for ${email}...`);
        const pdfPath = await generatePDF(itinerary);

        console.log(`[API: Export] Sending email to ${email}...`);
        const emailResult = await emailService.send(email, pdfPath);

        if (!emailResult.success) {
            console.error(`[API: Export] Email Service Failed: ${emailResult.message}`);
            return res.status(500).json({
                success: false,
                message: emailResult.message
            });
        }

        return res.json({
            success: true,
            message: 'Your itinerary has been emailed successfully.'
        });
    } catch (err: any) {
        console.error("[API: Export] Internal Error:", err);
        return res.status(500).json({
            success: false,
            message: 'Export failed due to server error.'
        });
    }
});

router.post('/send-itinerary-email', async (req, res) => {
    const { email, itinerary } = req.body;
    if (!email || !itinerary) {
        res.status(400).json({ success: false, message: "Missing email or itinerary data." });
        return;
    }
    try {
        const pdfPath = await generatePDF(itinerary);
        const emailResult = await emailService.send(email, pdfPath);
        if (!emailResult.success) {
            return res.status(500).json({ success: false, message: emailResult.message });
        }
        return res.json({ success: true, message: 'Your itinerary has been emailed successfully.' });
    } catch (err: any) {
        console.error("[API: Export] Internal Error:", err);
        return res.status(500).json({ success: false, message: 'Export failed due to server error.' });
    }
});

export default router;
