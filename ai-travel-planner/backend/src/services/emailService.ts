import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendItineraryEmail(toEmail: string, pdfBuffer: Buffer): Promise<void> {
    console.log(`[Email Service] Sending itinerary to ${toEmail}`);

    // Safety check for demo/dev mode
    if (!process.env.SMTP_USER || process.env.SMTP_USER.includes('your_email')) {
        console.warn("[Email Service] SMTP credentials not configured. Skipping email send.");
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: process.env.FROM_EMAIL || process.env.SMTP_USER,
            to: toEmail,
            subject: 'Your Dubai Trip Plan',
            text: 'Here is your personalized Dubai itinerary from your AI Travel Assistant.',
            html: '<p>Here is your personalized <b>Dubai itinerary</b> from your AI Travel Assistant.</p>',
            attachments: [
                {
                    filename: 'Dubai Trip Plan.pdf',
                    content: pdfBuffer
                }
            ]
        });

        console.log(`[Email Service] Message sent: ${info.messageId}`);
    } catch (error) {
        console.error("[Email Service] Error sending email:", error);
        throw new Error("Failed to send email");
    }
}
