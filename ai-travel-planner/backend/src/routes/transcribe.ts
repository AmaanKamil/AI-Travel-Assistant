import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import Groq from 'groq-sdk';

const router = Router();
const upload = multer({ dest: 'uploads/' });

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Define a type for the Multer request since standard Request might not have 'file'
interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

router.post('/', upload.single('audio'), async (req: any, res: any) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded' });
    }

    try {
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(req.file.path),
            model: 'whisper-large-v3'
        });

        // Cleanup uploaded file
        fs.unlinkSync(req.file.path);

        return res.json({
            text: transcription.text
        });
    } catch (err) {
        console.error("Transcription Error:", err);
        // Cleanup on error too if file exists
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({
            error: 'Speech transcription failed'
        });
    }
});

export default router;
