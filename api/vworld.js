import https from 'https';

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { key, domain } = req.query;
  if (!key || !domain) {
    return res.status(400).json({ error: "Missing Parameters" });
  }

  const params = new URLSearchParams(req.query);
  const queryString = params.toString().replace(/\+/g, '%20');

  // VWorld 통신 옵션 (한국 공공데이터포털 SSL 문제 우회 및 브라우저 위장)
  const options = {
    hostname: 'api.vworld.kr',
    path: `/req/data?${queryString}`,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': domain,
      'Accept': 'application/json'
    },
    rejectUnauthorized: false // 핵심: 공공기관 인증서 에러 무시
  };

  return new Promise((resolve) => {
    const proxyReq = https.request(options, (proxyRes) => {
      let body = '';
      
      // 데이터를 조각조각 받아서 하나로 합침 (502 에러 방지)
      proxyRes.on('data', (chunk) => { body += chunk; });
      
      proxyRes.on('end', () => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(proxyRes.statusCode || 200).send(body);
        resolve();
      });
    });

    proxyReq.on('error', (e) => {
      console.error('VWorld Request Error:', e);
      res.status(500).json({ error: 'VWorld Connection Error', message: e.message });
      resolve();
    });

    // 10초 이상 응답 없으면 타임아웃 처리
    proxyReq.setTimeout(10000, () => {
      proxyReq.destroy();
      res.status(504).json({ error: 'Gateway Timeout', message: 'VWorld 서버 무응답' });
      resolve();
    });

    proxyReq.end();
  });
}
