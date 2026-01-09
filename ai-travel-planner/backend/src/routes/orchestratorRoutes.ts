import { Router } from 'express';
import { handleUserInput } from '../orchestrator/orchestrator';

const router = Router();

router.post('/orchestrate', async (req, res) => {
    try {
        const { sessionId, transcript } = req.body;

        if (!sessionId || !transcript) {
            res.status(400).json({ error: "Missing sessionId or transcript" });
            return;
        }

        const response = await handleUserInput(sessionId, transcript);
        res.json(response);
    } catch (error) {
        console.error("Error in orchestrator:", error);
        res.status(500).json({ error: "Internal Server Error" });
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
        const pdfBuffer = await generateItineraryPDF(itinerary);

        // Send Email
        await sendItineraryEmail(userEmail, pdfBuffer);

        res.json({ status: 'success', message: 'Your itinerary has been sent to your email.' });

    } catch (error: any) {
        console.error("Error in export-itinerary:", error);
        res.status(500).json({ error: error.message || "Failed to export itinerary" });
    }
});

export default router;
