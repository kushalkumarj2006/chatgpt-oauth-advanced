const host = '0.0.0.0';
const port = process.env.PORT || 10000;

const cors_proxy = require('cors-anywhere');

const server = cors_proxy.createServer({
    originBlacklist: [],
    originWhitelist: [],
    requireHeader: [],
    removeHeaders: ['cookie', 'cookie2'],
    setHeaders: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    }
});

const originalListeners = server.listeners('request');
server.removeAllListeners('request');

server.on('request', (req, res) => {
    console.log(`\n[${new Date().toISOString()}] Incoming Request: ${req.method} ${req.url}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));

    if (req.url === '/health' || req.url === '/') {
        console.log('-> Intercepted /health or /, returning "ok"');
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('ok');
    }

    originalListeners.forEach(listener => listener.call(server, req, res));
});

server.listen(port, host, function() {
    console.log('Running CORS Anywhere on ' + host + ':' + port);
    
    const renderUrl = 'https://chatgpt-oauth-advanced.onrender.com';
    if (renderUrl) {
        const healthUrl = `${renderUrl}/health`;
        console.log(`Starting self-ping mechanism every 5 minutes to: ${healthUrl}`);
        
        setInterval(() => {
            console.log(`\n[${new Date().toISOString()}] [Self-Ping] Pinging ${healthUrl}...`);
            fetch(healthUrl)
                .then(res => res.text())
                .then(body => console.log(`[${new Date().toISOString()}] [Self-Ping] Response: ${body}`))
                .catch(err => console.error(`[${new Date().toISOString()}] [Self-Ping] Error:`, err.message));
        }, 5 * 60 * 1000);
    } else {
        console.log('RENDER_EXTERNAL_URL not set. Skipping self-ping (likely running locally).');
    }
});
