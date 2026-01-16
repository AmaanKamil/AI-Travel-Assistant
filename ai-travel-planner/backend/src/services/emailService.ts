import nodemailer from 'nodemailer';

export const emailService = {
    send: async (to: string, attachmentPath: string): Promise<{ success: boolean; message: string }> => {
        const provider = process.env.SMTP_HOST || 'MOCK';

        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn("[Email] Missing SMTP Configuration. Using MOCK MODE.");
            console.log(`[EMAIL_LOG] email: ${to} | provider: ${provider} | status: MOCK_SUCCESS`);
            return { success: true, message: "Email sent successfully (Mock Mode)." };
        }
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT),
                secure: false,
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

            // MANDATORY LOGGING & PROVIDER VALIDATION
            const isAccepted = info.accepted.length > 0;
            const isRejected = info.rejected.length > 0;

            console.log(`[EMAIL_LOG] email: ${to} | provider: ${provider} | response: ${info.messageId} | accepted: ${info.accepted.length} | rejected: ${info.rejected.length}`);

            if (!isAccepted || isRejected) {
                console.error(`[EMAIL] Provider partially or fully rejected the delivery to ${to}`);
                return { success: false, message: 'Provider rejected the delivery.' };
            }

            return { success: true, message: 'Email sent successfully!' };
        } catch (error: any) {
            console.error(`[EMAIL_LOG] email: ${to} | provider: ${provider} | error: ${error.message}`);
            return { success: false, message: `Failed to send: ${error.message}` };
        }
    }
};
