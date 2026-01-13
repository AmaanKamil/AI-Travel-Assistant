import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import Groq from 'groq-sdk';

const router = Router();
const upload = multer({ dest: 'uploads/' });

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

router.post('/', upload.single('audio'), async (req: any, res: any) => {
    console.log('➡️  /api/transcribe called');

    if (!req.file) {
        console.error('❌ No audio file received');
        return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const filePath = path.resolve(req.file.path);
    console.log('📁 Audio file path:', filePath);

    try {
        if (!process.env.GROQ_API_KEY) {
            console.error('❌ GROQ_API_KEY missing in environment');
            return res.status(500).json({ error: 'Server misconfigured: GROQ_API_KEY missing' });
        }

        console.log('🎙️ Sending audio to Groq Whisper...');

        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: 'whisper-large-v3'
        });

        fs.unlink(filePath, () => { });

        if (!transcription || !transcription.text) {
            console.error('❌ Empty transcription result');
            return res.status(500).json({ error: 'Empty transcription result' });
        }

        console.log('✅ Transcription success:', transcription.text);

        return res.json({ text: transcription.text });

    } catch (err: any) {
        console.error('🔥 Whisper transcription error:', err?.message || err);
        return res.status(500).json({
            error: 'Speech transcription failed'
        });
    }
});

export default router;
