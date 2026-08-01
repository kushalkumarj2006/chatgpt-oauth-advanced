// hybrid-proxy.js – works for ChatGPT AND DeepSeek
const express = require('express');
const app = express();

// Accept raw body for all methods (supports binary uploads)
app.use(express.raw({ type: '*/*', limit: '50mb' }));

// --------------------------
// 1. Preflight (OPTIONS)
// --------------------------
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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

  // Build target URL
  let targetUrl = req.path.substring(1);
  if (req._parsedUrl && req._parsedUrl.search) {
    targetUrl += req._parsedUrl.search;
  }
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    return res.status(400).send('Invalid target URL – must start with http:// or https://');
  }

  // Determine target host
  let targetHost;
  try {
    targetHost = new URL(targetUrl).hostname;
  } catch {
    return res.status(400).send('Invalid target URL');
  }

  const isChatGPT = targetHost.includes('chatgpt.com');
  const isDeepSeek = targetHost.includes('deepseek.com');

  // Build headers to forward
  const proxyHeaders = new Headers();

  if (isChatGPT) {
    // ---------- ChatGPT: old, proven behaviour ----------
    const allowedHeaders = [
      'content-type',
      'authorization',
      'chatgpt-account-id',
      'x-openai-internal-codex-responses-lite'
    ];
    for (const [key, value] of Object.entries(req.headers)) {
      if (allowedHeaders.includes(key.toLowerCase())) {
        proxyHeaders.set(key, value);
      }
    }
    proxyHeaders.set('Origin', 'https://chatgpt.com');
    proxyHeaders.set('Referer', 'https://chatgpt.com/');
    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    proxyHeaders.set('Accept', '*/*');
  } else if (isDeepSeek) {
    // ---------- DeepSeek: forward all headers ----------
    for (const [key, value] of Object.entries(req.headers)) {
      if (['host', 'connection', 'content-length'].includes(key)) continue;
      proxyHeaders.set(key, value);
    }
    if (!proxyHeaders.has('origin')) {
      proxyHeaders.set('Origin', 'https://chat.deepseek.com');
    }
    if (!proxyHeaders.has('referer')) {
      proxyHeaders.set('Referer', 'https://chat.deepseek.com/');
    }
    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
  } else {
    // ---------- Generic fallback ----------
    for (const [key, value] of Object.entries(req.headers)) {
      if (['host', 'connection', 'content-length'].includes(key)) continue;
      proxyHeaders.set(key, value);
    }
    if (!proxyHeaders.has('origin')) {
      proxyHeaders.set('Origin', 'https://example.com');
    }
    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
  }

  // Forward the request
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: proxyHeaders,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      redirect: 'manual'
    });

    // Copy response headers (skip hop‑by‑hop)
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (['connection', 'transfer-encoding', 'content-length', 'content-encoding'].includes(lowerKey)) return;
      res.setHeader(key, value);
    });

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    res.status(response.status);

    // Stream body (supports SSE and large files)
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
// 3. Keep alive (self‑ping)
// --------------------------
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`CORS proxy running on port ${port}`);
  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
  setInterval(() => {
    fetch(`${baseUrl}/health`)
      .then(res => res.text())
      .then(body => console.log(`[${new Date().toISOString()}] Self-ping OK`))
      .catch(err => console.error(`[${new Date().toISOString()}] Self-ping error:`, err.message));
  }, 5 * 60 * 1000);
});
