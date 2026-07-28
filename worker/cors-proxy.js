export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        }
      });
    }
    const url = new URL(request.url);
    const target = url.pathname.substring(1) + url.search;
    if (!target.startsWith('http')) {
      return new Response('Usage: https://your-proxy.workers.dev/https://target.com/path', { status: 400 });
    }
    const resp = await fetch(target, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    const out = new Response(resp.body, resp);
    out.headers.set('Access-Control-Allow-Origin', '*');
    out.headers.set('Access-Control-Expose-Headers', '*');
    return out;
  }
};
