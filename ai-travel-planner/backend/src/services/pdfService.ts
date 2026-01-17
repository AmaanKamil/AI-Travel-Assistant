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

            // Create a document with some margins
            const doc = new PDFDocument({
                margin: 50,
                size: 'A4'
            });

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // --- COLORS & STYLES ---
            const colors = {
                primary: '#2563eb', // Blue
                text: '#1f2937',    // Gray 800
                secondary: '#4b5563', // Gray 600
                lightGray: '#f3f4f6', // Gray 100
                accent: '#4f46e5',   // Indigo
                divider: '#e5e7eb'   // Gray 200
            };

            // --- HEADER SECTION ---
            doc.fillColor(colors.primary)
                .fontSize(24)
                .font('Helvetica-Bold')
                .text('Your Personalized Dubai Itinerary', { align: 'center' });

            doc.moveDown(0.2);

            doc.fillColor(colors.secondary)
                .fontSize(12)
                .font('Helvetica')
                .text('Curated for culture, shopping, and adventure', { align: 'center' });

            doc.moveDown(1);

            // Header Divider
            doc.moveTo(50, doc.y)
                .lineTo(545, doc.y)
                .strokeColor(colors.divider)
                .lineWidth(1)
                .stroke();

            doc.moveDown(1.5);

            // --- DAY WISE SECTIONS ---
            itinerary.days.forEach((day, index) => {
                // Day Header
                doc.fillColor(colors.text)
                    .fontSize(18)
                    .font('Helvetica-Bold')
                    .text(`Day ${day.day || (index + 1)}`);

                doc.moveDown(0.3);

                // Day underline
                doc.moveTo(50, doc.y)
                    .lineTo(150, doc.y)
                    .strokeColor(colors.primary)
                    .lineWidth(2)
                    .stroke();

                doc.moveDown(0.8);

                // Activities
                day.blocks.forEach((block: any, blockIdx: number) => {
                    const isMeal = block.type === 'MEAL' || block.mealType;
                    const blockType = isMeal ? 'Meal' : 'Attraction';

                    // Card background (alternating subtle shade)
                    const cardY = doc.y;
                    const cardHeight = isMeal ? 75 : 85;

                    // Check if we need a new page
                    if (cardY + cardHeight > 750) {
                        doc.addPage();
                    }

                    // Card Background
                    doc.roundedRect(50, doc.y, 495, cardHeight, 10)
                        .fillColor(blockIdx % 2 === 0 ? '#ffffff' : '#f9fafb')
                        .fill();

                    // Card Border
                    doc.roundedRect(50, doc.y, 495, cardHeight, 10)
                        .strokeColor(colors.divider)
                        .lineWidth(0.5)
                        .stroke();

                    // Content Padding
                    doc.fillColor(colors.text);
                    const textPaddingX = 65;
                    const textPaddingY = doc.y + 15;

                    // Title
                    doc.fontSize(14)
                        .font('Helvetica-Bold')
                        .text(block.activity, textPaddingX, textPaddingY);

                    // Type Label Tag
                    const typeLabel = blockType;
                    const labelX = 450;
                    const labelY = textPaddingY;

                    doc.fontSize(9)
                        .font('Helvetica-Bold')
                        .fillColor(isMeal ? '#059669' : colors.primary) // Green for meals, Blue for attractions
                        .text(typeLabel.toUpperCase(), labelX, labelY, { width: 80, align: 'right' });

                    doc.fillColor(colors.secondary);

                    // Duration
                    doc.fontSize(10)
                        .font('Helvetica')
                        .text(`Estimated duration: ${block.duration || '90 mins'}`, textPaddingX, doc.y + 5);

                    // Cuisine (Meals only)
                    if (isMeal && block.cuisine) {
                        doc.fontSize(10)
                            .font('Helvetica-Oblique')
                            .fillColor(colors.accent)
                            .text(`Cuisine: ${block.cuisine}`, textPaddingX, doc.y + 2);
                    } else if (block.description && !isMeal) {
                        // Small description for attractions if not a meal
                        doc.fontSize(9)
                            .font('Helvetica')
                            .fillColor(colors.secondary)
                            .text(block.description, textPaddingX, doc.y + 2, { width: 350, height: 12, ellipsis: true });
                    }

                    doc.y = cardY + cardHeight + 10; // Move y to below the card for the next one
                });

                doc.moveDown(1);
            });

            // --- FOOTER ---
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);

                doc.fillColor('#9ca3af')
                    .fontSize(8)
                    .font('Helvetica')
                    .text(
                        'Generated by your AI Travel Assistant',
                        50,
                        doc.page.height - 40,
                        { align: 'center', width: 495 }
                    );
            }

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
