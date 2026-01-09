import PDFDocument from 'pdfkit';
import { Itinerary } from '../types/itinerary';

export async function generateItineraryPDF(itinerary: Itinerary): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Title
            doc.fontSize(25).text('Dubai Trip Plan', { align: 'center' });
            doc.moveDown();

            if (itinerary.title) {
                doc.fontSize(18).text(itinerary.title, { align: 'center' });
                doc.moveDown();
            }

            // Iterate through days
            if (itinerary.days && itinerary.days.length > 0) {
                itinerary.days.forEach((dayPlan) => {
                    doc.addPage();
                    doc.fontSize(20).text(`Day ${dayPlan.day}`, { underline: true });
                    doc.moveDown();

                    // Group by time of day for cleaner layout
                    const groups: Record<string, typeof dayPlan.blocks> = {
                        'Morning': [],
                        'Afternoon': [],
                        'Evening': [],
                        'Other': []
                    };

                    dayPlan.blocks.forEach(block => {
                        const timeLower = block.time.toLowerCase();
                        let assigned = false;
                        if (timeLower.includes('morning') || (parseInt(block.time) >= 6 && parseInt(block.time) < 12)) {
                            groups['Morning'].push(block);
                            assigned = true;
                        } else if (timeLower.includes('afternoon') || (parseInt(block.time) >= 12 && parseInt(block.time) < 18)) {
                            groups['Afternoon'].push(block);
                            assigned = true;
                        } else if (timeLower.includes('evening') || parseInt(block.time) >= 18) {
                            groups['Evening'].push(block);
                            assigned = true;
                        }

                        if (!assigned) {
                            groups['Other'].push(block);
                        }
                    });

                    // Render groups
                    Object.entries(groups).forEach(([section, blocks]) => {
                        if (blocks.length > 0) {
                            doc.fontSize(16).fillColor('blue').text(section);
                            doc.moveDown(0.5);

                            blocks.forEach(block => {
                                doc.fontSize(12).fillColor('black').text(`• ${block.activity}`);
                                doc.fontSize(10).fillColor('gray').text(`   Duration: ${block.duration || 'N/A'}`, { indent: 10 });
                                doc.moveDown(0.5);
                            });
                            doc.moveDown();
                        }
                    });
                });
            } else {
                doc.fontSize(14).text("No itinerary details available.");
            }

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}
