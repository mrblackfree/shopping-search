# 중국 도매 상품 검색 웹앱

한국어 키워드로 중국 및 글로벌 도매 사이트(Alibaba, 1688, DHgate)에서 최저가 상품을 검색하고, URL 분석을 통해 더 저렴한 대안을 추천하는 웹앱입니다.

## 🎯 주요 기능

### 1. 키워드 검색
- 한국어 상품명 입력 → AI 자동 번역 → 3개 사이트 동시 검색
- Alibaba, DHgate: 영어 번역
- 1688: 중국어 번역
- 실시간 환율 적용으로 한화 변환

### 2. URL 분석
- 상품 URL 붙여넣기 → AI 한글 요약 → 대안 상품 추천
- 더 저렴한 대안이 있을 경우 절약 금액과 비율 표시
- 상품 사양, 판매자 정보 분석

### 3. 기타 기능
- 반응형 디자인 (모바일, 태블릿, PC 대응)
- 다크모드 지원
- 가격 정렬 및 필터링
- 링크 복사 및 새 탭 열기

## 🛠️ 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **AI**: DeepSeek API (번역, 요약)
- **환율**: exchangerate.host API
- **크롤링**: Axios, Cheerio
- **아이콘**: Heroicons
- **테마**: next-themes

## 📦 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
```bash
# .env.example을 .env.local로 복사
cp .env.example .env.local
```

`.env.local` 파일을 열고 실제 API 키로 변경하세요:

```env
# DeepSeek API Configuration
DEEPSEEK_API_KEY=your_actual_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
CUSTOM_KEY=production
```

**DeepSeek API 키 발급 방법**:
1. [DeepSeek Platform](https://platform.deepseek.com) 접속
2. 회원가입 및 로그인
3. API Keys 메뉴에서 새 키 생성
4. 생성된 키를 `.env.local`에 입력

### 3. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 4. 빌드 및 배포
```bash
npm run build
npm start
```

## 🌐 배포

### Vercel 배포
1. GitHub에 코드 푸시
2. [Vercel](https://vercel.com)에서 프로젝트 연결
3. **환경변수 설정** (Settings → Environment Variables):
   - `DEEPSEEK_API_KEY`: 실제 DeepSeek API 키
   - `DEEPSEEK_BASE_URL`: `https://api.deepseek.com`
   - `CUSTOM_KEY`: `production`
4. 자동 배포 완료

**중요**: 환경변수 설정 후 반드시 "Redeploy" 버튼을 클릭하여 재배포하세요!

## 📁 프로젝트 구조

```
Shopping/
├── components/          # React 컴포넌트
│   ├── Layout.tsx      # 메인 레이아웃
│   ├── SearchTab.tsx   # 키워드 검색 탭
│   ├── AnalyzeTab.tsx  # URL 분석 탭
│   ├── ProductTable.tsx # 상품 테이블
│   ├── ProductSummary.tsx # 상품 요약
│   └── ThemeToggle.tsx # 다크모드 토글
├── lib/                # 유틸리티 라이브러리
│   ├── scrapers/       # 사이트별 크롤러
│   │   ├── alibaba.ts
│   │   ├── dhgate.ts
│   │   └── china1688.ts
│   ├── deepseek.ts     # DeepSeek API
│   ├── exchange.ts     # 환율 API
│   └── types.ts        # TypeScript 타입
├── pages/              # Next.js 페이지
│   ├── api/           # API 엔드포인트
│   │   ├── search.ts
│   │   ├── analyze-url.ts
│   │   ├── translate.ts
│   │   └── exchange-rate.ts
│   ├── _app.tsx
│   ├── _document.tsx
│   └── index.tsx       # 메인 페이지
├── styles/
│   └── globals.css     # 전역 스타일
└── public/            # 정적 파일
```

## 🔧 API 엔드포인트

### POST /api/search
키워드로 3개 사이트 검색
```json
{
  "keyword": "무선 이어폰"
}
```

### POST /api/analyze-url
URL 분석 및 대안 추천
```json
{
  "url": "https://www.alibaba.com/product-detail/..."
}
```

### POST /api/translate
텍스트 번역
```json
{
  "text": "무선 이어폰",
  "targetLanguage": "en"
}
```

### GET /api/exchange-rate
실시간 환율 정보

## ⚠️ 주의사항

1. **웹 크롤링**: 각 사이트의 로봇 정책을 준수하세요
2. **API 제한**: DeepSeek API 사용량 제한에 주의하세요
3. **환율**: 실시간 환율이므로 실제 거래 시 차이가 있을 수 있습니다
4. **상품 정보**: 크롤링된 정보는 실시간이 아닐 수 있습니다

## 🚀 향후 개선 계획

- [ ] 상품 북마크 기능
- [ ] 가격 알림 기능
- [ ] 더 많은 사이트 지원
- [ ] 배송비 계산 기능
- [ ] 사용자 리뷰 분석
- [ ] 모바일 앱 개발

## 📄 라이선스

MIT License

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 생성해 주세요.

---

**⚡ 빠른 시작**: 위의 설치 가이드를 따라하시면 5분 안에 로컬에서 실행할 수 있습니다! 