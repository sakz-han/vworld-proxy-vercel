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

    // ★ 2. 클라이언트에서 전달된 키와 도메인 추출
    const VWORLD_KEY = queryParams.key;
    const VWORLD_DOMAIN = queryParams.domain;

    // 파라미터가 비어있다면 VWorld에 요청하기 전에 미리 차단
    if (!VWORLD_KEY || !VWORLD_DOMAIN) {
      return res.status(400).json({ 
        error: "Missing Parameters", 
        message: "URL 파라미터에 key와 domain 값이 포함되어야 합니다." 
      });
    }

    // ★ 3. 핵심 해결책: https 대신 http 사용 (TLS 인증서 충돌 방지)
    const targetUrl = new URL('http://api.vworld.kr/req/data');
    
    // 넘어온 파라미터들을 VWorld URL에 조립
    for (const [key, value] of Object.entries(queryParams)) {
      if (key !== 'key' && key !== 'domain') {
        targetUrl.searchParams.append(key, value);
      }
    }
    targetUrl.searchParams.append('key', VWORLD_KEY);
    targetUrl.searchParams.append('domain', VWORLD_DOMAIN);

    // ★ 4. 핵심 해결책: 브라우저인 척 위장하는 User-Agent 헤더 추가
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(200).json(data);
    } else {
      const textData = await response.text();
      return res.status(response.status).send(textData);
    }

  } catch (error) {
    // 에러 발생 시 더 상세한 원인(cause)을 출력하도록 수정
    console.error('Proxy Error:', error);
    return res.status(502).json({ 
      error: 'Bad Gateway', 
      message: error.message,
      cause: error.cause ? error.cause.message : 'Unknown'
    });
  }
}
