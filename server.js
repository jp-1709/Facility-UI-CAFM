import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3004;

// Logging middleware for all requests
app.use((req, res, next) => {
  // Normalize double slashes in URL
  if (req.url.includes('//')) {
    req.url = req.url.replace(/\/\/+/g, '/');
  }
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Accept: ${req.headers.accept}`);
  next();
});

// Proxy API requests
const proxyMiddleware = createProxyMiddleware({
  pathFilter: ['/api', '/facility/api'],
  target: 'http://facility.quantcloud.in',
  changeOrigin: true,
  secure: false,
  cookieDomainRewrite: "localhost",
});

app.use(proxyMiddleware);

// Serve static files from the build directory
const distPath = path.join(__dirname, 'dist');
app.use('/facility', express.static(distPath));
app.use(express.static(distPath));

// SPA fallback for frontend routing
app.use((req, res, next) => {
  // If it's a GET request and expects HTML (or is a navigation request)
  // We'll be more permissive for navigation requests: 
  // if it's a GET and doesn't look like a file (no dot in the last segment)
  const looksLikeRoute = req.method === 'GET' && !req.path.split('/').pop().includes('.');
  const expectsHtml = req.accepts('html') || (req.headers.accept && req.headers.accept.includes('text/html'));

  if (looksLikeRoute || expectsHtml) {
    if (req.method === 'GET') {
      console.log(`[SPA Fallback] Serving index.html for: ${req.url}`);
      return res.sendFile(path.join(distPath, 'index.html'));
    }
  }
  next();
});

// Final 404 handler for non-HTML requests
app.use((req, res) => {
  console.log(`[404 Final] Not Found: ${req.url} [${req.method}]`);
  res.status(404).send(`Not Found: ${req.url}`);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
