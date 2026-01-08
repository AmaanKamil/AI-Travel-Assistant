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

export default router;
