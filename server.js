const http = require('http');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Don Omar Radio Sessions</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            height: 100vh;
            background: linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('https://i.postimg.cc/wv7mvZcR/169eeac4-5490-4a74-99bf-111b73150c13.jpg');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            text-align: center;
        }
        .card {
            background: rgba(15, 15, 15, 0.85);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            padding: 30px 20px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            border: 1px solid rgba(255,255,255,0.15);
            max-width: 320px;
            width: 85%;
        }
        h1 { font-size: 20px; margin: 0 0 8px 0; letter-spacing: 1px; }
        p { color: #00FF66; font-size: 13px; margin-bottom: 22px; font-weight: bold; }
        button {
            background: #E50914;
            color: white;
            border: none;
            padding: 14px 28px;
            font-size: 15px;
            font-weight: bold;
            border-radius: 50px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(229, 9, 20, 0.4);
            width: 100%;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>📻 DON OMAR RADIO</h1>
        <p>🔴 EN VIVO</p>
        <button id="playBtn">▶ SINTONIZAR AHORA</button>
    </div>

    <script>
        let audioCtx;
        const btn = document.getElementById('playBtn');

        btn.onclick = () => {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            btn.innerText = "🔊 CONECTANDO...";
            const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            const ws = new WebSocket(wsProtocol + '//' + location.host + '/listen-live');
            ws.binaryType = 'arraybuffer';

            let nextTime = 0;

            ws.onopen = () => {
                btn.innerText = "🔴 ESCUCHANDO EN VIVO";
                btn.style.background = "#1DB954";
            };

            ws.onmessage = (event) => {
                const int16Array = new Int16Array(event.data);
                const numFrames = int16Array.length / 2;
                if (numFrames <= 0) return;

                const audioBuffer = audioCtx.createBuffer(2, numFrames, 44100);
                const left = audioBuffer.getChannelData(0);
                const right = audioBuffer.getChannelData(1);

                for (let i = 0; i < numFrames; i++) {
                    left[i] = int16Array[i * 2] / 32768;
                    right[i] = int16Array[i * 2 + 1] / 32768;
                }

                const source = audioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioCtx.destination);

                const currentTime = audioCtx.currentTime;
                if (nextTime < currentTime) {
                    nextTime = currentTime;
                }
                source.start(nextTime);
                nextTime += audioBuffer.duration;
            };

            ws.onclose = () => {
                btn.innerText = "⚪ RADIO DESCONECTADA";
                btn.style.background = "#333333";
            };
        };
    </script>
</body>
</html>
    `);
});

const wss = new WebSocket.Server({ noServer: true });
let listenerSockets = [];

server.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        if (req.url === '/broadcast') {
            console.log('App conectada transmitiendo');
            ws.on('message', (data) => {
                listenerSockets.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(data);
                    }
                });
            });
        } else if (req.url === '/listen-live') {
            listenerSockets.push(ws);
            ws.on('close', () => {
                listenerSockets = listenerSockets.filter(c => c !== ws);
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Radio operativa'));

