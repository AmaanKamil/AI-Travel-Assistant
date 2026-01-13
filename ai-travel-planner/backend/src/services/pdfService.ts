import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { Itinerary } from '../types/itinerary';

export async function generatePDF(itinerary: Itinerary): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const fileName = `itinerary-${Date.now()}.pdf`;
            const outputDir = path.join(process.cwd(), 'tmp');

            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const filePath = path.join(outputDir, fileName);

            const doc = new PDFDocument();
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);

            doc.fontSize(20).text('Dubai Trip Plan', { align: 'center' });
            doc.moveDown();

            itinerary.days.forEach((day, i) => {
                doc.fontSize(16).text(`Day ${i + 1}`, { underline: true });
                doc.moveDown(0.5);

                // Adapted 'activities' -> 'blocks' and 'title' -> 'activity'
                day.blocks.forEach((act: any) => {
                    doc.fontSize(12).text(`• ${act.activity} (${act.duration || 'Time varies'})`);
                });

                doc.moveDown();
            });

            doc.end();

            stream.on('finish', () => resolve(filePath));
            stream.on('error', err => reject(err));
        } catch (err) {
            reject(err);
        }
    });
}

export const pdfService = {
    generate: generatePDF
};
