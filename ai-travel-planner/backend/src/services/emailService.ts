import nodemailer from 'nodemailer';

export const emailService = {
    send: async (to: string, attachmentPath: string): Promise<{ success: boolean; message: string }> => {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error("[Email] Missing SMTP Configuration");
            return { success: false, message: "Server email configuration incomplete." };
        }
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

            return { success: true, message: 'Email sent successfully!' };
        } catch (err: any) {
            console.error('Email send failed:', err);
            return { success: false, message: err.message || 'Failed to send email.' };
        }
    }
};
