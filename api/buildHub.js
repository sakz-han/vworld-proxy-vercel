export default async function handler(req, res) {
  // 1. CORS 정책 허용 (프론트엔드에서 접근 가능하도록 설정)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // 브라우저의 사전 요청(Preflight) 처리
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. 프론트엔드에서 넘어온 파라미터 추출
  const { sigunguCd, bjdongCd, platGbCd, bun, ji } = req.query;

  // 3. 발급받은 공공데이터포털 API 키 및 엔드포인트
  const API_KEY = 'ac91064e6b1a5db4893d6937d9d368814e53156a80479c707b535f350df23318';
  // 표제부 조회 API 기본 주소
  const BASE_URL = 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo';

  try {
    // 4. 공공데이터 API로 보낼 요청 주소 조립
    // URLSearchParams를 사용하면 파라미터 인코딩이 자동으로 처리됩니다.
    const url = new URL(BASE_URL);
    url.searchParams.append('serviceKey', API_KEY);
    
    if (sigunguCd) url.searchParams.append('sigunguCd', sigunguCd);
    if (bjdongCd) url.searchParams.append('bjdongCd', bjdongCd);
    if (platGbCd) url.searchParams.append('platGbCd', platGbCd);
    if (bun) url.searchParams.append('bun', bun);
    if (ji) url.searchParams.append('ji', ji);
    
    url.searchParams.append('numOfRows', '10');
    url.searchParams.append('pageNo', '1');
    url.searchParams.append('_type', 'json');

    // 5. 공공데이터 서버로 요청 전송
    const response = await fetch(url.toString());
    
    // 응답이 정상인지 확인
    if (!response.ok) {
      throw new Error(`Public API responded with status: ${response.status}`);
    }

    const data = await response.json();

    // 6. 프론트엔드로 결과 반환
    res.status(200).json(data);
    
  } catch (error) {
    console.error('BuildHub Proxy Error:', error);
    res.status(500).json({ 
      error: '건축HUB API 호출 중 서버 오류가 발생했습니다.',
      details: error.message 
    });
  }
}
