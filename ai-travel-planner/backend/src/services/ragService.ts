import { Chroma } from "@langchain/community/vectorstores/chroma";
import axios from 'axios';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { handleError } from '../utils/errorHandler';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

import { LocalEmbeddings } from "../rag/embeddings";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const embeddings = new LocalEmbeddings();

export interface GroundedAnswer {
    answer: string;
    citations: { source: string; url: string; section?: string }[];
}

export async function getGroundedAnswer(query: string): Promise<GroundedAnswer> {
    console.log(`[RAG Service] Searching for: "${query}"`);

    try {
        const vectorStore = await Chroma.fromExistingCollection(embeddings, {
            collectionName: "dubai_travel_knowledge",
            url: process.env.CHROMA_URL || "http://localhost:8000"
        });

        // 1. Retrieve
        const results = await vectorStore.similaritySearch(query, 3);

        if (results.length === 0) {
            console.log("[RAG Service] No relevant chunks found. Returning strict fallback.");
            return {
                answer: "I don't have enough reliable public information to answer this confidently based on my current knowledge base.",
                citations: []
            };
        }

        // 2. Synthesize
        const context = results.map((doc: any) => doc.pageContent).join("\n\n");
        const prompt = `
        You are a helpful travel assistant.
        Answer the user's question based ONLY on the context below. 
        If the answer is not in the context, explicitly say "I don't know based on the available information."
        Do not make up facts.
        
        Context:
        ${context}
        
        Question: ${query}
        `;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0 // Strict deterministic
        });

        const answer = completion.choices[0]?.message?.content || "I couldn't generate an answer.";

        // 3. Format Citations
        const citations = results.map((doc: any) => ({
            source: doc.metadata.source,
            url: doc.metadata.url,
            section: doc.metadata.section
        }));

        return { answer, citations };

    } catch (error) {
        handleError(error, 'RAG Service');
        return {
            answer: "I couldn't find reliable information for this. I'll stick to what I know for sure.",
            citations: []
        };
    }
}
