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
import { sendEmail } from '../services/emailService';

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
    const { sessionId, email } = req.body; // Expecting { sessionId, email }

    if (!sessionId || !email) {
        res.status(400).json({ success: false, message: "Missing sessionId or email" });
        return;
    }

    const ctx = getSession(sessionId);

    if (!ctx || !ctx.itinerary) {
        return res.status(400).json({
            success: false,
            message: 'No itinerary to export.'
        });
    }

    try {
        const pdfPath = await generatePDF(ctx.itinerary);
        await sendEmail(email, pdfPath);

        return res.json({
            success: true,
            message: 'Your itinerary has been emailed successfully.'
        });
    } catch (err) {
        console.error("Export Failed", err);
        return res.status(500).json({
            success: false,
            message: 'Export failed. Please try again.'
        });
    }
});

export default router;
