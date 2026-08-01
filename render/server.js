// proxy.js – CORS proxy with all headers forwarded, streaming, and self-ping
// Deploy on Render, Heroku, or any Node.js host.

const express = require('express');
const app = express();

// Accept raw body for all methods (needed for POST/PUT with binary data)
app.use(express.raw({ type: '*/*', limit: '50mb' }));

// --------------------------
// 1. Handle preflight (OPTIONS) – respond with CORS headers
// --------------------------
app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', '*');          // Allow all headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');   // For cookies
    res.status(204).end();
});

// --------------------------
// 2. Main proxy handler
// --------------------------
app.all('*', async (req, res) => {
    console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.url}`);

    // Health check
    if (req.path === '/health' || req.path === '/') {
        return res.send('ok');
    }

    // Build target URL: everything after the first slash is the target
    let targetUrl = req.path.substring(1);
    if (req._parsedUrl && req._parsedUrl.search) {
        targetUrl += req._parsedUrl.search;
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        return res.status(400).send('Invalid target URL – must start with http:// or https://');
    }

    // --------------------------
    // 3. Copy ALL headers from the original request
    // --------------------------
    const proxyHeaders = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
        // Skip headers that would cause issues if forwarded
        if (key === 'host' || key === 'connection' || key === 'content-length') continue;
        proxyHeaders.set(key, value);
    }

    // Override/spoof User-Agent and Origin for compatibility (optional)
    // If the original Origin is present, we keep it; otherwise we set a fallback.
    // For DeepSeek, we want the real Origin from the client.
    // We'll keep the original if present.
    if (!proxyHeaders.has('origin')) {
        proxyHeaders.set('Origin', 'https://chat.deepseek.com');
    }
    // Set a modern User-Agent
    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

    // --------------------------
    // 4. Forward the request
    // --------------------------
    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: proxyHeaders,
            // For GET/HEAD, body must be undefined; for others, use req.body
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
            redirect: 'manual' // we handle redirects manually if needed (but we don't)
        });

        // Copy response headers (except CORS and hop-by-hop)
        response.headers.forEach((value, key) => {
            const lowerKey = key.toLowerCase();
            // Skip hop-by-hop and content-* that are automatically handled by Express
            if (['connection', 'transfer-encoding', 'content-length', 'content-encoding'].includes(lowerKey)) return;
            // Allow CORS headers to be set by us, but we can also forward them
            res.setHeader(key, value);
        });

        // Add CORS headers to the response
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Expose-Headers', '*'); // expose all headers to client
        res.setHeader('Access-Control-Allow-Credentials', 'true');

        res.status(response.status);

        // --------------------------
        // 5. Stream the response body (supports SSE and large files)
        // --------------------------
        if (response.body) {
            const reader = response.body.getReader();
            const pump = async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        res.write(value);
                    }
                    res.end();
                } catch (err) {
                    console.error('Stream error:', err);
                    if (!res.headersSent) {
                        res.status(500).send('Stream Error');
                    } else {
                        res.end();
                    }
                }
            };
            pump();
        } else {
            res.end();
        }

    } catch (err) {
        console.error('Proxy Error:', err);
        if (!res.headersSent) {
            res.status(500).send('Proxy Error: ' + err.message);
        } else {
            res.end();
        }
    }
});

// --------------------------
// 6. Keep the service alive (self-ping every 5 minutes)
// --------------------------
const port = process.env.PORT || 10000;
app.listen(port, () => {
    console.log(`CORS proxy running on port ${port}`);
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
    // Self-ping to prevent idle sleep on free tiers
    setInterval(() => {
        fetch(`${baseUrl}/health`)
            .then(res => res.text())
            .then(body => console.log(`[${new Date().toISOString()}] Self-ping OK`))
            .catch(err => console.error(`[${new Date().toISOString()}] Self-ping error:`, err.message));
    }, 5 * 60 * 1000);
});
