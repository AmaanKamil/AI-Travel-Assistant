import nodemailer from 'nodemailer';

export async function sendEmail(
    to: string,
    attachmentPath: string
): Promise<void> {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: false, // true for 465, false for others
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        await transporter.sendMail({
            from: process.env.FROM_EMAIL,
            to,
            subject: 'Your Dubai Trip Itinerary',
            text: 'Attached is your personalized Dubai travel plan.',
            attachments: [
                {
                    filename: 'Dubai-Trip-Plan.pdf',
                    path: attachmentPath
                }
            ]
        });
    } catch (err) {
        throw new Error('Email sending failed');
    }
}

export const emailService = {
    send: sendEmail
};
