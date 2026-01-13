let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let isRecording = false;

export async function toggleRecording(
    setListening: (v: boolean) => void,
    onTranscriptReady: (text: string) => void
) {
    if (!isRecording) {
        await startRecording(setListening, onTranscriptReady);
    } else {
        stopRecording();
    }
}

async function startRecording(
    setListening: (v: boolean) => void,
    onTranscriptReady: (text: string) => void
) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

    mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });

        const formData = new FormData();
        formData.append('audio', blob, 'speech.webm');

        setListening(false);

        try {
            const res = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            onTranscriptReady(data.text);
        } catch (err) {
            alert('Speech transcription failed. Please try again.');
        }
    };

    mediaRecorder.start();
    isRecording = true;
    setListening(true);
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    isRecording = false;
}
