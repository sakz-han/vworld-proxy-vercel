export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight 요청 처리
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
    // 1. 요청 파라미터 재조립
    const params = new URLSearchParams(req.query);
    const queryString = params.toString().replace(/\+/g, '%20');
    const targetUrl = `https://api.vworld.kr/req/data?${queryString}`;

    // 2. 최신 fetch API를 사용해 VWorld에 요청
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': domain
      }
    });

    // 3. 응답 데이터를 텍스트(JSON 문자열)로 추출
    const data = await response.text();

    // 4. 안전하게 Content-Type만 지정하여 클라이언트에 반환 (502 에러 방지)
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(response.status).send(data);

  } catch (error) {
    console.error('Fetch Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}
