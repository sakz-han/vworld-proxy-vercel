const https = require('https');

module.exports = async function(req, res) {
  // 1. CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  // Preflight 요청 통과
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { key, domain } = req.query;

    if (!key || !domain) {
      return res.status(400).json({ error: "Missing Parameters", message: "key와 domain이 필요합니다." });
    }

    // 2. 파라미터 조립 및 인코딩 보정 (★ 매우 중요)
    const params = new URLSearchParams(req.query);
    // URLSearchParams는 공백을 '+'로 변환하는데, VWorld는 이를 인식하지 못하므로 '%20'으로 강제 복구합니다.
    const queryString = params.toString().replace(/\+/g, '%20');

    // 3. 통신 옵션 설정 (IPv4 강제, Referer 헤더 추가)
    const options = {
      hostname: 'api.vworld.kr',
      path: '/req/data?' + queryString,
      method: 'GET',
      family: 4, // IPv4망 강제 사용 (Socket Hang up 방지)
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': domain // ★ VWorld 인증을 위해 도메인을 Referer로 위장
      }
    };

    // 4. 파이프(Pipe) 방식으로 데이터 즉시 릴레이
    const proxyReq = https.request(options, (proxyRes) => {
      // VWorld의 응답 헤더(콘텐츠 타입 등)를 그대로 클라이언트에게 복사
      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/json;charset=UTF-8');
      res.status(proxyRes.statusCode);

      // 데이터를 Vercel 서버 메모리에 쌓지 않고, 들어오는 즉시 클라이언트로 흘려보냄
      proxyRes.pipe(res);
    });

    // 5. 에러 및 타임아웃 처리 방어막
    proxyReq.on('error', (e) => {
      console.error('VWorld Request Error:', e);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Proxy Request Failed', details: e.message });
      }
    });

    // Vercel의 10초 타임아웃 전인 8초에 연결을 끊고 에러 반환 (하드 502 크래시 방지)
    proxyReq.setTimeout(8000, () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({ error: 'Gateway Timeout', message: 'VWorld 서버가 응답하지 않습니다.' });
      }
    });

    proxyReq.end(); // 요청 실행

  } catch (err) {
    console.error('Server Catch Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
  }
};
