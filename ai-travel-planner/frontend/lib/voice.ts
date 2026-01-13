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
            if (!process.env.NEXT_PUBLIC_API_URL) {
                console.error('NEXT_PUBLIC_API_URL is not defined');
                alert('App misconfiguration. Please contact support.');
                return;
            }

            const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/transcribe`;
            console.log('🎙️ Sending audio to:', endpoint);

            const res = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error('❌ Transcribe failed:', errText);
                alert('Speech transcription failed. Check console for details.');
                return;
            }

            const data = await res.json();
            onTranscriptReady(data.text);

        } catch (err) {
            console.error('🌐 Network error:', err);
            alert('Network error while transcribing speech.');
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
