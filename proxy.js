// proxy.js – CORS proxy for Blogger feed
const http = require('http');
const https = require('https');

const PORT = 3002;
const BLOG_BASE = 'https://tryumphmagazine.blogspot.com';
const DEFAULT_PATH = '/feeds/posts/default?alt=json&max-results=50';

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Build the upstream URL: if the request path is just "/", use the default feed
  const upstreamPath = (req.url === '/' || req.url === '') ? DEFAULT_PATH : req.url;
  const target = `${BLOG_BASE}${upstreamPath}`;

  console.log(`[Proxy] → ${target}`);

  const proxyReq = https.get(target, (resp) => {
    let data = '';
    resp.on('data', (chunk) => data += chunk);
    resp.on('end', () => {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300'
      });
      res.end(data);
    });
  });

  proxyReq.on('error', (e) => {
    console.error('Proxy upstream error:', e.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('Proxy upstream error: ' + e.message);
    }
  });

  proxyReq.setTimeout(10000, () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.writeHead(504, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('Proxy timeout');
    }
  });
});

server.on('error', (e) => console.error('Server error:', e));

server.listen(PORT, () => {
  console.log(`✅ Blogger proxy listening on http://localhost:${PORT}`);
});
