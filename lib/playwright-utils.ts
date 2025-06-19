import { Browser, Page, chromium, firefox } from 'playwright';

// 봇 감지 우회를 위한 고급 브라우저 설정
export async function createStealthBrowser(): Promise<Browser> {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images', // 이미지 로딩 비활성화로 속도 향상
    ]
  });

  return browser;
}

// 스텔스 페이지 설정
export async function createStealthPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();

  // 실제 브라우저처럼 보이도록 설정
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', {
      get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
  });

  // 뷰포트 설정
  await page.setViewportSize({ width: 1920, height: 1080 });

  // 추가 헤더 설정
  await page.setExtraHTTPHeaders({
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Upgrade-Insecure-Requests': '1'
  });

  // 불필요한 리소스 차단으로 속도 향상
  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
      route.abort();
    } else {
      route.continue();
    }
  });

  return page;
}

// 자연스러운 딜레이 (봇 감지 우회)
export async function randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
}

// 요소가 나타날 때까지 대기 (여러 셀렉터 시도)
export async function waitForAnySelector(page: Page, selectors: string[], timeout: number = 10000): Promise<string | null> {
  try {
    const result = await Promise.race(
      selectors.map(async (selector) => {
        try {
          await page.waitForSelector(selector, { timeout, state: 'visible' });
          return selector;
        } catch {
          return null;
        }
      })
    );
    return result;
  } catch {
    return null;
  }
}

// 스크롤하여 동적 콘텐츠 로드
export async function scrollToLoadContent(page: Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight || totalHeight >= 2000) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

// 사이트별 User-Agent 로테이션
export function getRandomUserAgent(site: string): string {
  const userAgents = {
    alibaba: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ],
    dhgate: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36'
    ],
    '1688': [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  };

  const agents = userAgents[site as keyof typeof userAgents] || userAgents.alibaba;
  return agents[Math.floor(Math.random() * agents.length)];
}

// 에러 재시도 로직
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
      console.log(`재시도 ${i + 1}/${maxRetries} (${delay}ms 후)...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('모든 재시도 실패');
} 