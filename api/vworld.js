import https from 'https'; // ← http에서 https로 변경

export default async function handler(req, res) {
  // 1. CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  // Preflight 요청 통과
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return new Promise((resolve) => {
    const { key, domain } = req.query;
    
    if (!key || !domain) {
      res.status(400).json({ 
        error: "Missing Parameters", 
        message: "key와 domain이 필요합니다." 
      });
      return resolve();
    }

    // 2. 파라미터 조립 및 인코딩 보정
    const params = new URLSearchParams(req.query);
    const queryString = params.toString().replace(/\+/g, '%20');

    // 3. HTTPS 통신 옵션 설정
    const options = {
      hostname: 'api.vworld.kr',
      path: '/req/data?' + queryString,
      method: 'GET',
      family: 4, // IPv4 강제
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': domain
      }
    };

    // 4. https 모듈로 요청
    const proxyReq = https.request(options, (proxyRes) => {
      res.setHeader('Content-Type', 
        proxyRes.headers['content-type'] || 'application/json;charset=UTF-8'
      );
      res.status(proxyRes.statusCode);
      
      proxyRes.pipe(res);
      
      proxyRes.on('end', () => {
        resolve();
      });
    });

    // 5. 에러 및 타임아웃 처리
    proxyReq.on('error', (e) => {
      console.error('VWorld Request Error:', e);
      if (!res.headersSent) {
        res.status(502).json({ 
          error: 'Proxy Request Failed', 
          details: e.message 
        });
      }
      resolve();
    });

    proxyReq.setTimeout(8000, () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({ 
          error: 'Gateway Timeout', 
          message: 'VWorld 서버가 응답하지 않습니다.' 
        });
      }
      resolve();
    });

    proxyReq.end();
  });
}
