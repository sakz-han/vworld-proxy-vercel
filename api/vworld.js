// api/vworld.js
export default async function handler(req, res) {
  // 1. CORS 헤더 설정 (모바일 브라우저 요청 허용)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Preflight 요청(OPTIONS) 처리
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 2. 클라이언트에서 넘어온 쿼리 파라미터 추출
    const queryParams = req.query;

    // ★ 중요: VWorld API 키와 도메인을 반드시 넣어주어야 합니다.
    // 클라이언트에서 넘기지 않을 경우를 대비해 환경변수나 하드코딩으로 기본값을 설정하세요.
    const VWORLD_KEY = process.env.VWORLD_KEY || queryParams.key || '발급받은_VWORLD_API_키_입력';
    const VWORLD_DOMAIN = process.env.VWORLD_DOMAIN || queryParams.domain || '등록한_도메인_입력(예: localhost)';

    // 3. VWorld 타겟 URL 객체 생성 (URLSearchParams가 인코딩을 안전하게 자동 처리)
    const targetUrl = new URL('https://api.vworld.kr/req/data');
    
    for (const [key, value] of Object.entries(queryParams)) {
      if (key !== 'key' && key !== 'domain') {
        targetUrl.searchParams.append(key, value);
      }
    }
    targetUrl.searchParams.append('key', VWORLD_KEY);
    targetUrl.searchParams.append('domain', VWORLD_DOMAIN);

    // 4. VWorld로 요청 전송
    const response = await fetch(targetUrl.toString());

    // 5. VWorld 응답이 JSON인지 텍스트(XML 등 에러)인지 확인 후 안전하게 파싱
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // VWorld에서 에러 발생 시 XML이나 평문으로 올 수 있음
      const textData = await response.text();
      return res.status(response.status).send(textData);
    }

    // 6. 결과 반환
    res.status(200).json(data);

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(502).json({ error: 'Bad Gateway', message: error.message });
  }
}
