import http from 'http';

export default async function handler(req, res) {
  // 1. CORS 헤더 설정 (모바일 및 로컬 접근 허용)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Preflight 요청 통과
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const queryParams = req.query;

    // 파라미터 누락 방어
    if (!queryParams.key || !queryParams.domain) {
      return res.status(400).json({ error: "Missing Parameters", message: "key와 domain이 필요합니다." });
    }

    // 2. 타겟 URL 조립 (VWorld 서버)
    const targetUrl = new URL('http://api.vworld.kr/req/data');
    for (const [key, value] of Object.entries(queryParams)) {
      if (key !== 'key' && key !== 'domain') {
        targetUrl.searchParams.append(key, value);
      }
    }
    targetUrl.searchParams.append('key', queryParams.key);
    targetUrl.searchParams.append('domain', queryParams.domain);

    // 3. fetch 대신 안정적인 http 코어 모듈 사용
    const options = {
      hostname: targetUrl.hostname,
      path: targetUrl.pathname + targetUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
      }
    };

    // 4. VWorld 서버에 직접 스트림 연결
    const vworldData = await new Promise((resolve, reject) => {
      const request = http.request(options, (response) => {
        let data = '';
        // 데이터가 쪼개져서 올 경우 합치기
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
      request.end(); // 요청 전송
    });

    // 5. 응답 결과 클라이언트로 반환
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
