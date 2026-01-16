import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

console.log("[MailConfig] Transporter created for:", process.env.EMAIL_USER);

transporter.verify((error, success) => {
    if (error) {
        console.error("[MailConfig] SMTP verification failed:", error);
    } else {
        console.log("[MailConfig] SMTP server is ready to send emails");
    }
});
