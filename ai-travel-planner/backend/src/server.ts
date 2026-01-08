import app from './app';

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Orchestrator service is running on port ${PORT}`);
});
