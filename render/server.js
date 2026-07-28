// Listen on a specific port via the PORT environment variable
const host = '0.0.0.0';
const port = process.env.PORT || 10000;

const cors_proxy = require('cors-anywhere');

cors_proxy.createServer({
    originBlacklist: [],
    originWhitelist: [],
    requireHeader: [],
    removeHeaders: ['cookie', 'cookie2'],
    // Spoof headers to bypass OpenAI's WAF blocks
    setHeaders: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    }
}).listen(port, host, function() {
    console.log('Running CORS Anywhere on ' + host + ':' + port);
});
