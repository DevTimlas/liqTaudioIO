const startButton = document.getElementById('startButton');
const transcriptionDiv = document.getElementById('transcription');
const llmOutputDiv = document.getElementById('llmOutput');
const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
const isEdge = /Edg/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
const speakButton = document.getElementById('speakButton');
const textInput = document.getElementById('llmOutput');

console.log(isChrome);
console.log(isEdge);

let accumulatedTranscript = ''; // Variable to store the accumulated transcript

function initializeDeepGram() {
    let isRecording = false;
    let mediaRecorder;
    let socket;

    function startRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            socket = new WebSocket('wss://api.deepgram.com/v1/listen', ['token', 'fb16011642005947ce81a75725aa14dc884822ce']);
            transcriptionDiv.textContent='';

            socket.onopen = () => {
                console.log({ event: 'onopen' });
                document.querySelector('#status').textContent = 'Connected';
                document.getElementById('status').classList.remove('disconnected');
                document.getElementById('status').classList.add('connected');
                mediaRecorder.addEventListener('dataavailable', event => {
                    if (event.data.size > 0 && socket.readyState == 1) {
                        socket.send(event.data);
                    }
                });
                mediaRecorder.start(100);
            };
            

            socket.onmessage = (message) => {
                console.log({ event: 'onmessage', message });
                const received = JSON.parse(message.data);
                const transcript = received.channel.alternatives[0].transcript;
                if (transcript && received.is_final) {
                    transcriptionDiv.textContent += transcript + ' ';
                    // sendAudioToServer(transcript);
                    
                    accumulatedTranscript += transcript + ' '; // Accumulate the transcript
                    
                }
            };

            socket.onclose = () => {
                console.log({ event: 'onclose' });
            };

            socket.onerror = (error) => {
                console.log({ event: 'onerror', error });
            };
        });
    }

    function stopRecording() {
        if (mediaRecorder && socket) {
            mediaRecorder.stop();
            socket.close();
            document.querySelector('#status').textContent = 'Connection closed';
			document.getElementById('status').classList.remove('connected');
			document.getElementById('status').classList.add('disconnected');
            // Stop tracks to release microphone
            const tracks = mediaRecorder.stream.getTracks();
            tracks.forEach(track => track.stop());
            sendAudioToServer(accumulatedTranscript);
            accumulatedTranscript = ''; // Reset the accumulated transcript
            // transcriptionDiv.textContent='';
        }
    }
    
    function sendAudioToServer(audio) {
        fetch('http://localhost:5000/speech', {
            method: 'POST',
            body: JSON.stringify({ text: audio }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                return response.text(); // Return response text if successful
            } else {
                throw new Error('Failed to send speech');
            }
        })
        .then(data => {
            llmOutputDiv.textContent = data; // Update the llmOutput div with the LLM output
        })
        .catch(error => console.error('Error:', error));
    }

    startButton.addEventListener('click', () => {
        if (!isRecording) {
            startRecording();
            startButton.textContent = 'Stop Recorder';
            isRecording = true;
        } else {
            stopRecording();
            startButton.textContent = 'Start Recorder';
            isRecording = false;
        }
    });
}




speakButton.addEventListener('click', () => {
    const text = textInput.textContent.trim();
    if (text !== '') {
        convertAndSpeak(text);
    }
});

function convertAndSpeak(text) {
    // Convert text to speech using Deepgram API
    const DEEPGRAM_URL = "https://api.deepgram.com/v1/speak?model=aura-asteria-en";
    const DEEPGRAM_API_KEY = "fb16011642005947ce81a75725aa14dc884822ce";

    const payload = JSON.stringify({
        text: text,
    });

    const requestConfig = {
        method: "POST",
        headers: {
            Authorization: `Token ${DEEPGRAM_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: payload
    };

    fetch(DEEPGRAM_URL, requestConfig)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.blob();
        })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.play();
            window.URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Error:', error);
        });

    // Speak text using Web Speech API
    speak(text);
}

function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
}
        
        
        

// if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) 
if (isChrome && !isEdge) {
    let isBrave;
    try {
        isBrave = window.navigator.brave.isBrave.name == "isBrave";
    } catch (e) {}

    if (!isBrave) {
        console.log("Speech recognition API supported");
        document.querySelector('#status').textContent = 'Connected';
        document.getElementById('status').classList.remove('connected');
        const recognition = new window.webkitSpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let isRecording = false;

        recognition.onresult = function (event) {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    const finalTranscript = event.results[i][0].transcript;
                    transcriptionDiv.textContent += finalTranscript + ' ';
                    // sendAudioToServer(finalTranscript);
                    accumulatedTranscript += finalTranscript + ' ';
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
        };

        function startRecording() {
            isRecording = true;
            transcriptionDiv.textContent='';
            recognition.start();
        }

        function stopRecording() {
            isRecording = false;
            recognition.stop();
            sendAudioToServer(accumulatedTranscript);
            accumulatedTranscript = '';
        }

        function sendAudioToServer(audio) {
		    fetch('http://localhost:5000/speech', {
		        method: 'POST',
		        body: JSON.stringify({ text: audio }),
		        headers: {
		            'Content-Type': 'application/json'
		        }
		    })
		    .then(response => {
		        if (response.ok) {
		            return response.text(); // Return response text if successful
		        } else {
		            throw new Error('Failed to send speech');
		        }
		    })
		    .then(data => {
		        llmOutputDiv.textContent = data; // Update the llmOutput div with the LLM output
		    })
		    .catch(error => console.error('Error:', error));
		}


        startButton.addEventListener('click', () => {
            if (!isRecording) {
                startRecording();
                startButton.textContent = 'Stop Recording';
            } else {
                stopRecording();
                startButton.textContent = 'Start Recording';
                document.getElementById('status').classList.add('connected');
            }
        });
    } else {
        console.log("Brave not supported using DeepGram")
        initializeDeepGram();
    }
} else {
    console.log("Speech recognition API not supported Using DeepGram")
    initializeDeepGram();
}

