import { Router } from 'express';
// Adapted import path to where sessionContext actually is
import { getSession, saveSession } from '../orchestrator/sessionContext';
import { applyDeterministicEdit } from '../services/editEngine';
import { EditOperation, EditIntentType } from '../types/edit';

const router = Router();

router.post('/', async (req, res) => {
    const { sessionId, command } = req.body;

    if (!sessionId || !command) {
        res.status(400).json({
            success: false,
            message: 'Missing sessionId or command.'
        });
        return;
    }

    const ctx = getSession(sessionId);

    if (!ctx || !ctx.itinerary) {
        res.status(400).json({
            success: false,
            message: 'No itinerary found. Please create a trip plan first.'
        });
        return;
    }

    const match = command.match(/day\s+(\d+)/i);

    if (!match) {
        res.status(400).json({
            success: false,
            message: 'Please specify the day, like “Make Day 2 more relaxed”.'
        });
        return;
    }

    const day = parseInt(match[1], 10);

    const intent: EditOperation = {
        intent: EditIntentType.RELAX_DAY,
        sourceDay: day,
        rawInstruction: command
    };

    try {
        const result = applyDeterministicEdit(ctx.itinerary, intent);

        if (result.success) {
            ctx.itinerary = result.itinerary;
            saveSession(ctx);

            res.json({
                success: true,
                message: result.message || "I've updated your itinerary.",
                itinerary: result.itinerary
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message || 'Could not apply the requested edit.'
            });
        }
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Failed to update itinerary. Please try again.'
        });
    }
});

export default router;
