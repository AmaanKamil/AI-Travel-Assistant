import { Router } from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('audio'), async (req, res) => {
    console.log('➡️ /api/transcribe hit');

    if (!process.env.GROQ_API_KEY) {
        console.error('❌ GROQ_API_KEY missing');
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    if (!req.file) {
        console.error('❌ No audio received');
        return res.status(400).json({ error: 'No audio file uploaded' });
    }

    try {
        const form = new FormData();
        form.append('file', req.file.buffer, {
            filename: 'speech.webm',
            contentType: req.file.mimetype
        });
        form.append('model', 'whisper-large-v3');

        console.log('🎙️ Sending audio to Groq Whisper API');

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: form as any
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('🔥 Groq API error:', errText);
            return res.status(500).json({
                error: 'Speech transcription failed'
            });
        }

        const data = await response.json();

        if (!data.text) {
            console.error('❌ Empty transcription response');
            return res.status(500).json({
                error: 'Empty transcription result'
            });
        }

        console.log('✅ Transcription:', data.text);
        return res.json({ text: data.text });

    } catch (err: any) {
        console.error('🔥 Whisper crash:', err?.message || err);
        return res.status(500).json({
            error: 'Speech transcription failed'
        });
    }
});

export default router;
