import https from 'https';

export default async function handler(req, res) {
  // CORS 설정 (모든 도메인 허용)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // URL 파라미터 조립
  const params = new URLSearchParams(req.query);
  
  // 프론트에서 'endpoint' 파라미터를 넘기면 해당 API로 연결, 없으면 'basicInfo.do'(일반현황)로 기본 연결
  const endpoint = params.get('endpoint') || 'basicInfo.do';
  params.delete('endpoint'); // 실제 공공기관 API에 넘길 땐 빼줌

  const queryString = params.toString().replace(/\+/g, '%20');

  // 유치원알리미 통신 옵션 (한국 공공데이터포털 SSL 문제 우회)
  const options = {
    hostname: 'e-childschoolinfo.moe.go.kr',
    path: `/api/notice/${endpoint}?${queryString}`,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json'
    },
    rejectUnauthorized: false // 공공기관 인증서 에러 무조건 무시
  };

  return new Promise((resolve) => {
    const proxyReq = https.request(options, (proxyRes) => {
      let body = '';
      
      proxyRes.on('data', (chunk) => { body += chunk; });
      
      proxyRes.on('end', () => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(proxyRes.statusCode || 200).send(body);
        resolve();
      });
    });

    proxyReq.on('error', (e) => {
      console.error('Kindergarten Request Error:', e);
      res.status(500).json({ error: 'Kindergarten Connection Error', message: e.message });
      resolve();
    });

    proxyReq.setTimeout(10000, () => {
      proxyReq.destroy();
      res.status(504).json({ error: 'Gateway Timeout', message: '유치원알리미 서버 무응답' });
      resolve();
    });

    proxyReq.end();
  });
}
