import app from './app';
// Force load mail config and verify SMTP on boot
import './services/mailConfig';

const PORT = process.env.PORT || 4000;

// Production Environment Check
const isProduction = process.env.NODE_ENV === 'production';

console.log(`[Server] Starting in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode...`);

// Critical Environment Variable Validation
const criticalVars = ['GROQ_API_KEY', 'EMAIL_USER', 'EMAIL_APP_PASSWORD'];
const missingVars = criticalVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
    console.warn(`[Server] WARNING: Missing critical environment variables: ${missingVars.join(', ')}`);
    console.warn(`[Server] Some features may not work correctly.`);
}

app.listen(PORT, () => {
    console.log(`[Server] AI Travel Assistant Backend is running on port ${PORT}`);
    if (!isProduction) {
        console.log(`[Server] Local URL: http://localhost:${PORT}`);
    }
});
