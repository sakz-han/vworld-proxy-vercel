import https from 'https';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { key, domain } = req.query;

  if (!key || !domain) {
    return res.status(400).json({
      error: "Missing Parameters",
      message: "key와 domain이 필요합니다."
    });
  }

  try {
    const params = new URLSearchParams(req.query);
    const queryString = params.toString().replace(/\+/g, '%20');

    const options = {
      hostname: 'api.vworld.kr',
      path: `/req/data?${queryString}`,
      method: 'GET',
      family: 4,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': domain,
      },
      timeout: 8000,
    };

    return new Promise((resolve) => {
      const proxyReq = https.request(options, (proxyRes) => {
        // Forward status and headers
        res.status(proxyRes.statusCode || 200);
        
        Object.keys(proxyRes.headers).forEach((key) => {
          res.setHeader(key, proxyRes.headers[key]);
        });

        proxyRes.pipe(res);

        proxyRes.on('end', () => resolve());
      });

      proxyReq.on('error', (e) => {
        console.error('VWorld Request Error:', e);
        if (!res.headersSent) {
          res.status(502).json({
            error: 'Proxy Request Failed',
            details: e.message,
          });
        }
        resolve();
      });

      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        if (!res.headersSent) {
          res.status(504).json({
            error: 'Gateway Timeout',
            message: 'VWorld 서버가 응답하지 않습니다.',
          });
        }
        resolve();
      });

      proxyReq.end();
    });
  } catch (error) {
    console.error('Handler Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  }
}
