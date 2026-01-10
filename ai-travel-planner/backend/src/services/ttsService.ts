import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

// Initialize OpenAI Lazily
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
} else {
    console.warn("[TTS Service] OPENAI_API_KEY missing. TTS will be disabled.");
}

export async function generateSpeech(text: string): Promise<string | null> {
    if (!openai) {
        console.warn("[TTS Service] No OpenAI Client. Skipping TTS.");
        return null;
    }
    try {
        if (!text) return null;
        console.log(`[TTS Service] Generating speech for: "${text.substring(0, 50)}..."`);

        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: text,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        return buffer.toString('base64');

    } catch (error) {
        console.error("TTS Generation Failed:", error);
        return null;
    }
}
