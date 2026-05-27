export default async function handler(req, res) {
  // CORS 설정 (어디서든 접근 가능하도록)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const params = new URLSearchParams(req.query);
    const queryString = params.toString();

    // 🚨 핵심: 아래 변수에 원래 유치원 데이터를 주던 '진짜 API 주소'를 넣어야 합니다.
    const TARGET_API_BASE_URL = "여기에_원래_유치원_API_주소를_넣으세요"; 
    
    const targetUrl = `${TARGET_API_BASE_URL}?${queryString}`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
      },
      rejectUnauthorized: false // 공공기관 인증서 에러 무시
    });

    const data = await response.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(response.status).send(data);

  } catch (error) {
    console.error('Kindergarten Fetch Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
