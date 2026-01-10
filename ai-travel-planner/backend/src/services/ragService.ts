import { Chroma } from "@langchain/community/vectorstores/chroma";
import { LocalEmbeddings } from "../rag/embeddings";
import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') dotenv.config();

type RAGSource = {
    title: string;
    url?: string;
};

type RAGResult = {
    answer: string;
    sources: RAGSource[];
};

// Internal Helper to maintain DB connection without changing DB
async function searchVectorDB(query: string): Promise<{ text: string; sources: RAGSource[] }[]> {
    try {
        const embeddings = new LocalEmbeddings();
        const vectorStore = await Chroma.fromExistingCollection(embeddings, {
            collectionName: "dubai_travel_knowledge",
            url: process.env.CHROMA_URL || "http://localhost:8000"
        });

        const results = await vectorStore.similaritySearch(query, 3);

        return results.map(doc => ({
            text: doc.pageContent,
            sources: [{
                title: doc.metadata.source || 'Unknown Source',
                url: doc.metadata.url
            }]
        }));
    } catch (e) {
        console.error("Vector DB Search Error", e);
        return [];
    }
}

export async function getGroundedAnswer(query: string): Promise<RAGResult> {
    const results = await searchVectorDB(query);

    if (!results || results.length === 0) {
        return {
            answer: '',
            sources: []
        };
    }

    const top = results[0];

    return {
        answer: top.text,
        sources: top.sources || []
    };
}
