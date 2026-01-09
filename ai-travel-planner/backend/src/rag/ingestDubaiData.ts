import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";

dotenv.config();

import { LocalEmbeddings } from "./embeddings";

const URLS = [
    { url: "https://en.wikivoyage.org/wiki/Dubai", source: "wikivoyage" },
    { url: "https://en.wikipedia.org/wiki/Dubai", source: "wikipedia" },
    { url: "https://www.visitdubai.com/en", source: "visitdubai" },
    { url: "https://u.ae/en/information-and-services/visiting-and-exploring-the-uae/tourism-in-the-uae", source: "uae_portal" }
];

async function fetchAndExtract(urlObj: { url: string; source: string }) {
    console.log(`[Ingest] Fetching: ${urlObj.url}`);
    try {
        const { data } = await axios.get(urlObj.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(data as string);

        // Remove scripts, styles, and boilerplate
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('footer').remove();
        $('header').remove();

        const text = $('body').text().replace(/\s+/g, ' ').trim();
        return {
            text,
            source: urlObj.source,
            url: urlObj.url
        };
    } catch (error) {
        console.error(`[Ingest] Failed to fetch ${urlObj.url}`, error);
        return null;
    }
}

async function ingestData() {
    console.log("Starting Data Ingestion...");


    const embeddings = new LocalEmbeddings();

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 800,
        chunkOverlap: 120
    });

    const docs = [];

    for (const urlObj of URLS) {
        const data = await fetchAndExtract(urlObj);
        if (data) {
            const chunks = await splitter.createDocuments(
                [data.text],
                [{ source: data.source, url: data.url }]
            );
            console.log(`[Ingest] ${data.source}: Created ${chunks.length} chunks`);
            docs.push(...chunks);
        }
    }

    console.log(`[Ingest] Indexing ${docs.length} total chunks into Chroma...`);

    // Using embedded Chroma (no URL needed typically for local, but langchain wrapper might assume a server)
    // For simplicity in this scaffold, we'll try to use the default local configuration.
    // Ensure you have pip install chromadb or run chroma docker if using python backend, 
    // but for JS, if 'chromadb' is installed, it often tries to connect to a service.
    // If we want pure embedded JS, verify library constraints. 
    // The instructions said "Chroma in embedded mode". 
    // In Node.js, standard 'chromadb' package is a client. A docker container is usually required.
    // However, we will follow the instruction to "use the package". If it fails needing a server, we will notify.

    await Chroma.fromDocuments(docs, embeddings, {
        collectionName: "dubai_travel_knowledge",
        url: "http://localhost:8000" // Default Chroma URL, user might need to run it
    });

    console.log("[Ingest] Ingestion Complete!");
}

ingestData().catch(console.error);
