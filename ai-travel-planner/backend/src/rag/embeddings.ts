import { pipeline } from '@xenova/transformers';

export class LocalEmbeddings {
    private pipe: any = null;

    async init() {
        if (!this.pipe) {
            this.pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        }
    }

    async embedDocuments(documents: string[]): Promise<number[][]> {
        await this.init();
        const results = [];
        for (const doc of documents) {
            const embedding = await this.embedQuery(doc);
            results.push(embedding);
        }
        return results;
    }

    async embedQuery(text: string): Promise<number[]> {
        await this.init();
        const output = await this.pipe(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }
}
