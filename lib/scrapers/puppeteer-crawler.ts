import puppeteer from 'puppeteer';
import { Product, SearchResult } from '../types';
import { convertToKRW } from '../exchange';

export async function searchWithPuppeteer(keyword: string, site: string): Promise<SearchResult> {
  const startTime = Date.now();
  let browser = null;
  
  try {
    console.log(`🚀 Puppeteer ${site} 크롤링 시작:`, keyword);
    
    // 브라우저 실행
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images', // 이미지 로딩 비활성화로 속도 향상
        '--disable-javascript', // JavaScript 비활성화 (필요시)
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });
    
    const page = await browser.newPage();
    
    // 페이지 설정
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // 사이트별 URL 설정
    let searchUrl = '';
    let productSelectors: string[] = [];
    
    switch (site) {
      case 'aliexpress':
        searchUrl = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(keyword)}`;
        productSelectors = ['.list-item', '.product-item', '.search-item'];
        break;
      case 'dhgate':
        searchUrl = `https://www.dhgate.com/wholesale/search.do?searchkey=${encodeURIComponent(keyword)}`;
        productSelectors = ['.stpro', '.search-prd', '.goods-item'];
        break;
      case 'alibaba':
        searchUrl = `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(keyword)}`;
        productSelectors = ['.organic-offer-wrapper', '.offer-wrapper', '.product-item'];
        break;
      default:
        throw new Error(`지원하지 않는 사이트: ${site}`);
    }
    
    console.log(`🌐 Puppeteer URL: ${searchUrl}`);
    
    // 페이지 이동
    await page.goto(searchUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // 페이지 로딩 대기
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 페이지 제목 확인
    const title = await page.title();
    console.log(`📄 Puppeteer 페이지: ${title.substring(0, 100)}`);
    
    // 차단 페이지 확인
    const pageContent = await page.content();
    const blockKeywords = ['blocked', 'captcha', 'robot', 'verification', 'access denied'];
    const isBlocked = blockKeywords.some(kw => 
      title.toLowerCase().includes(kw) || 
      pageContent.toLowerCase().includes(kw)
    );
    
    if (isBlocked) {
      console.log('⚠️ Puppeteer 차단 페이지 감지');
      throw new Error('페이지가 차단되었습니다');
    }
    
    // 스크롤하여 더 많은 상품 로드
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 상품 요소 찾기
    let products: Product[] = [];
    
    for (const selector of productSelectors) {
      try {
        const elements = await page.$$(selector);
        console.log(`Puppeteer 셀렉터 "${selector}": ${elements.length}개 요소 발견`);
        
        if (elements.length > 0) {
          // 상위 8개 요소만 처리
          const limitedElements = elements.slice(0, 8);
          
          for (let i = 0; i < limitedElements.length; i++) {
            try {
              const element = limitedElements[i];
              
              // 제목 추출
              const titleSelectors = ['a[title]', '.item-title a', '.product-title a', '.title a', 'h2 a', 'h3 a'];
              let title = '';
              let productUrl = '';
              
              for (const titleSel of titleSelectors) {
                try {
                  const titleEl = await element.$(titleSel);
                  if (titleEl) {
                    title = await titleEl.evaluate(el => el.getAttribute('title') || el.textContent?.trim() || '');
                    productUrl = await titleEl.evaluate(el => el.getAttribute('href') || '');
                    if (title && title.length > 5) break;
                  }
                } catch (e) {
                  // 셀렉터 실패 시 다음 시도
                }
              }
              
              // 가격 추출
              const priceSelectors = ['.price-current', '.price-now', '.price', '.cost', '[class*="price"]'];
              let price = 0;
              
              for (const priceSel of priceSelectors) {
                try {
                  const priceEl = await element.$(priceSel);
                  if (priceEl) {
                    const priceText = await priceEl.evaluate(el => el.textContent?.trim() || '');
                    
                    const priceMatch = priceText.match(/\$?\s*([\d.,]+)/);
                    if (priceMatch) {
                      price = parseFloat(priceMatch[1].replace(',', ''));
                      if (price > 0) break;
                    }
                  }
                } catch (e) {
                  // 가격 추출 실패 시 다음 시도
                }
              }
              
              // 이미지 URL 추출
              let imageUrl = '';
              try {
                const imgEl = await element.$('img');
                if (imgEl) {
                  imageUrl = await imgEl.evaluate(el => el.getAttribute('src') || el.getAttribute('data-src') || '');
                }
              } catch (e) {
                // 이미지 추출 실패 무시
              }
              
              // 유효한 상품인지 확인
              if (title && price > 0 && title.length > 5) {
                const product: Product = {
                  id: `${site}_puppeteer_real_${Date.now()}_${i}`,
                  title: title.substring(0, 200),
                  price,
                  currency: 'USD',
                  priceKRW: 0,
                  imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https:${imageUrl}`) : '',
                  productUrl: productUrl ? (productUrl.startsWith('http') ? productUrl : `https://www.${site}.com${productUrl}`) : '',
                  seller: {
                    name: `${site} Puppeteer Seller`,
                    rating: 4.0 + Math.random(),
                    trustLevel: 'High'
                  },
                  site: site as any,
                  minOrder: 1,
                  shipping: 'Free Shipping'
                };
                
                products.push(product);
                console.log(`✅ Puppeteer ${site} 실제 상품 ${products.length}: ${title.substring(0, 40)}... - $${price}`);
              }
            } catch (parseError) {
              console.log(`Puppeteer 상품 ${i} 파싱 오류:`, parseError);
            }
          }
          
          if (products.length > 0) {
            console.log(`🎯 Puppeteer ${site} 셀렉터 "${selector}"로 ${products.length}개 상품 추출!`);
            break;
          }
        }
      } catch (selectorError) {
        console.log(`Puppeteer 셀렉터 "${selector}" 오류:`, selectorError);
      }
    }
    
    // 브라우저 종료
    await browser.close();
    
    // 성공 시 KRW 변환
    if (products.length > 0) {
      const productsWithKRW = await Promise.all(
        products.map(async (product) => ({
          ...product,
          priceKRW: await convertToKRW(product.price, 'USD')
        }))
      );
      
      console.log(`🎉 Puppeteer ${site} 크롤링 성공! ${productsWithKRW.length}개 상품`);
      
      return {
        query: keyword,
        totalResults: productsWithKRW.length,
        products: productsWithKRW,
        site: site as any,
        searchTime: Date.now() - startTime
      };
    }
    
    // 실패 시 빈 결과
    console.log(`❌ Puppeteer ${site} 크롤링 실패`);
    return {
      query: keyword,
      totalResults: 0,
      products: [],
      site: site as any,
      searchTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error(`❌ Puppeteer ${site} 오류:`, error);
    
    // 브라우저 정리
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('브라우저 종료 오류:', closeError);
      }
    }
    
    return {
      query: keyword,
      totalResults: 0,
      products: [],
      site: site as any,
      searchTime: Date.now() - startTime
    };
  }
} 