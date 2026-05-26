import http from 'http';

export default async function handler(req, res) {
  // 1. CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  // Preflight 요청 통과
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ★ Vercel 환경에서 스트림(pipe)이 끊기지 않도록 Promise로 안전하게 감싸기
  return new Promise((resolve) => {
    const { key, domain } = req.query;

    if (!key || !domain) {
      res.status(400).json({ error: "Missing Parameters", message: "key와 domain이 필요합니다." });
      return resolve();
    }

    // 2. 파라미터 조립 및 인코딩 보정 (공백을 %20으로)
    const params = new URLSearchParams(req.query);
    const queryString = params.toString().replace(/\+/g, '%20');

    // 3. 통신 옵션 설정 (HTTPS 에러 방지를 위해 HTTP 사용, IPv4 강제)
    const options = {
      hostname: 'api.vworld.kr',
      path: '/req/data?' + queryString,
      method: 'GET',
      family: 4, // IPv4 강제 사용 (Socket Hang up 원천 차단)
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': domain // VWorld 인증을 위해 도메인을 Referer로 위장
      }
    };

    // 4. http 코어 모듈을 사용해 파이프(Pipe) 방식으로 즉시 릴레이
    const proxyReq = http.request(options, (proxyRes) => {
      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/json;charset=UTF-8');
      res.status(proxyRes.statusCode);

      // 데이터를 Vercel 메모리에 쌓지 않고 브라우저로 즉시 흘려보냄
      proxyRes.pipe(res);

      // 전송이 완전히 끝나면 Vercel 함수를 안전하게 종료
      proxyRes.on('end', () => {
        resolve();
      });
    });

    // 5. 에러 및 타임아웃 처리
    proxyReq.on('error', (e) => {
      console.error('VWorld Request Error:', e);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Proxy Request Failed', details: e.message });
      }
      resolve();
    });

    // 8초 이상 응답이 없으면 강제 종료 (Vercel 크래시 방지)
    proxyReq.setTimeout(8000, () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({ error: 'Gateway Timeout', message: 'VWorld 서버가 응답하지 않습니다.' });
      }
      resolve();
    });

    proxyReq.end(); // 요청 실행
  });
}
