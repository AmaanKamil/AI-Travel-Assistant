import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import Groq from 'groq-sdk';

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

router.post('/', upload.single('audio'), async (req, res) => {
    console.log('➡️  /api/transcribe hit');

    if (!process.env.GROQ_API_KEY) {
        console.error('❌ GROQ_API_KEY missing');
        return res.status(500).json({
            error: 'Server misconfigured'
        });
    }

    if (!req.file) {
        console.error('❌ No audio received');
        return res.status(400).json({
            error: 'No audio file uploaded'
        });
    }

    try {
        console.log('🎙️ Sending audio to Groq Whisper...');

        const transcription = await groq.audio.transcriptions.create({
            file: {
                value: req.file.buffer,
                options: {
                    filename: 'speech.webm',
                    contentType: req.file.mimetype
                }
            } as any,
            model: 'whisper-large-v3'
        });

        if (!transcription || !transcription.text) {
            console.error('❌ Empty transcription');
            return res.status(500).json({
                error: 'Empty transcription result'
            });
        }

        console.log('✅ Transcription:', transcription.text);

        return res.json({ text: transcription.text });

    } catch (err: any) {
        console.error('🔥 Whisper error:', err?.message || err);
        return res.status(500).json({
            error: 'Speech transcription failed'
        });
    }
});

export default router;
