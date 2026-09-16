const http = require('http');
const WebSocket = require('ws');

let listeners = [];

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.url === '/listen') {
        res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Transfer-Encoding': 'chunked',
            'Connection': 'keep-alive'
        });
        listeners.push(res);
        req.on('close', () => {
            listeners = listeners.filter(client => client !== res);
        });
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head><title>Don Omar Radio</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
            <body style="background:#121212; color:white; text-align:center; padding-top:50px; font-family:sans-serif;">
                <h1>📻 Don Omar Radio Sessions</h1>
                <p>Transmitiendo en Vivo</p>
                <audio controls autoplay src="/listen" style="margin-top:20px; width:80%; max-width:400px;"></audio>
            </body>
            </html>
        `);
    }
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
    if (req.url === '/broadcast') {
        console.log('Emisor conectado');
        ws.on('message', (chunk) => {
            listeners.forEach(client => client.write(chunk));
        });
        ws.on('close', () => console.log('Emisor desconectado'));
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Radio online en puerto ${PORT}`));
