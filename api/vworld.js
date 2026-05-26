import https from 'https'; // HTTPS 모듈 사용

export default async function handler(req, res) {
  // 1. CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Preflight 요청(OPTIONS) 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const queryParams = req.query;

    if (!queryParams.key || !queryParams.domain) {
      return res.status(400).json({ error: "Missing Parameters", message: "key와 domain이 필요합니다." });
    }

    // 2. VWorld HTTPS 주소 조립
    const targetUrl = new URL('https://api.vworld.kr/req/data');
    for (const [key, value] of Object.entries(queryParams)) {
      if (key !== 'key' && key !== 'domain') {
        targetUrl.searchParams.append(key, value);
      }
    }
    targetUrl.searchParams.append('key', queryParams.key);
    targetUrl.searchParams.append('domain', queryParams.domain);

    // 3. 통신 옵션 (핵심 해결책 포함)
    const options = {
      hostname: targetUrl.hostname,
      path: targetUrl.pathname + targetUrl.search,
      method: 'GET',
      family: 4, // ★ 핵심: VWorld 서버의 IPv6 연결 거부를 막기 위해 강제로 IPv4망 사용
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Host': 'api.vworld.kr' // Host 강제 지정
      }
    };

    // 4. 요청 보내기
    const vworldData = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: data
          });
        });
      });
      request.on('error', (error) => reject(error));
      request.end(); 
    });

    // 5. 결과 반환
    const contentType = vworldData.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      try {
        const jsonData = JSON.parse(vworldData.body);
        return res.status(vworldData.status).json(jsonData);
      } catch (parseError) {
        return res.status(500).json({ error: 'JSON Parse Error', data: vworldData.body });
      }
    } else {
      return res.status(vworldData.status).send(vworldData.body);
    }

  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(502).json({ 
      error: 'Bad Gateway', 
      message: 'VWorld 서버 통신 중 오류가 발생했습니다.',
      detail: error.message
    });
  }
}
