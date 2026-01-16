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

            const mailOptions = {
                from: process.env.SMTP_USER,
                to,
                subject: 'Your Dubai Itinerary',
                text: 'Here is the PDF itinerary you requested.',
                attachments: [
                    {
                        filename: 'itinerary.pdf',
                        path: attachmentPath
                    }
                ]
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('[EMAIL] SUCCESS:', info.messageId);
            return { success: true, message: 'Email sent successfully!' };
        } catch (error: any) {
            console.error('[EMAIL] FAILED (Nodemailer):', error);
            return { success: false, message: `Failed to send: ${error.message}` };
        }
    }
};
