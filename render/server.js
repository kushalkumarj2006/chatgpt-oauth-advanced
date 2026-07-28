const express = require('express');
const app = express();

app.use(express.raw({ type: '*/*', limit: '50mb' }));

app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.status(204).end();
});

app.all('*', async (req, res) => {
    console.log(`\n[${new Date().toISOString()}] Incoming: ${req.method} ${req.url}`);

    if (req.path === '/health' || req.path === '/') {
        return res.send('ok');
    }

    let targetUrl = req.path.substring(1);
    if (req._parsedUrl && req._parsedUrl.search) {
        targetUrl += req._parsedUrl.search;
    }

    if (!targetUrl.startsWith('http')) {
        return res.status(400).send('Invalid target URL');
    }

    const proxyHeaders = new Headers();
    const allowedHeaders = ['content-type', 'authorization', 'chatgpt-account-id', 'x-openai-internal-codex-responses-lite'];
    
    for (const key in req.headers) {
        if (allowedHeaders.includes(key.toLowerCase())) {
            proxyHeaders.set(key, req.headers[key]);
        }
    }

    // Crucial: Spoof origin to bypass OpenAI WAF
    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    proxyHeaders.set('Accept', '*/*');
    proxyHeaders.set('Origin', 'https://chatgpt.com');
    proxyHeaders.set('Referer', 'https://chatgpt.com/');

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: proxyHeaders,
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
            redirect: 'manual'
        });

        response.headers.forEach((value, key) => {
            if (!key.toLowerCase().startsWith('access-control') && !['content-encoding', 'transfer-encoding', 'connection', 'content-length'].includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        });

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Expose-Headers', '*');
        res.status(response.status);

        if (response.body) {
            const reader = response.body.getReader();
            const pump = async () => {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(value);
                }
                res.end();
            };
            pump().catch(e => {
                console.error('Stream error:', e);
                if (!res.headersSent) res.status(500).send('Stream Error');
                else res.end();
            });
        } else {
            res.end();
        }

    } catch (err) {
        console.error('Proxy Error:', err);
        if (!res.headersSent) res.status(500).send('Proxy Error: ' + err.message);
    }
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
    console.log(`Custom Proxy running on port ${port}`);
    
    const renderUrl = 'https://chatgpt-oauth-advanced.onrender.com';
    const healthUrl = `${renderUrl}/health`;
    
    setInterval(() => {
        console.log(`\n[${new Date().toISOString()}] [Self-Ping] Pinging ${healthUrl}...`);
        fetch(healthUrl)
            .then(res => res.text())
            .then(body => console.log(`[${new Date().toISOString()}] [Self-Ping] Response: ${body}`))
            .catch(err => console.error(`[${new Date().toISOString()}] [Self-Ping] Error:`, err.message));
    }, 5 * 60 * 1000);
});
