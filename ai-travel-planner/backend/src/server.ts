import app from './app';

const PORT = process.env.PORT || 5000;

// Production Environment Check
const isProduction = process.env.NODE_ENV === 'production';

console.log(`[Server] Starting in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode...`);

// Critical Environment Variable Validation
const criticalVars = ['GROQ_API_KEY'];
const missingVars = criticalVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
    console.warn(`[Server] WARNING: Missing critical environment variables: ${missingVars.join(', ')}`);
    console.warn(`[Server] Some features may not work correctly.`);
}

// Mail Configuration Check
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`[Server] WARNING: SMTP credentials (SMTP_USER/SMTP_PASS) are not configured. Email export will be disabled.`);
}

app.listen(PORT, () => {
    console.log(`[Server] AI Travel Assistant Backend is running on port ${PORT}`);
    if (!isProduction) {
        console.log(`[Server] Local URL: http://localhost:${PORT}`);
    }
});
