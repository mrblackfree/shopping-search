import { Product, SearchResult } from '../types';
import { convertToKRW } from '../exchange';
import { 
  createStealthBrowser, 
  createStealthPage, 
  randomDelay, 
  waitForAnySelector, 
  scrollToLoadContent,
  retryWithBackoff,
  getRandomUserAgent
} from '../playwright-utils';

export async function searchDHgate(keyword: string): Promise<SearchResult> {
  const startTime = Date.now();
  
  return await retryWithBackoff(async () => {
    const browser = await createStealthBrowser();
    let page;
    
    try {
      console.log('🔍 DHgate 검색 시작:', keyword);
      
      page = await createStealthPage(browser);
      
      // 간단한 데스크톱 설정
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // 기본 User-Agent 설정
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });

      // 간단한 검색 URL
      const searchUrl = `https://www.dhgate.com/wholesale/search.do?searchkey=${encodeURIComponent(keyword)}`;
      
      console.log('🌐 DHgate URL:', searchUrl);
      
      // 페이지 로드
      console.log('📥 페이지 로딩 중...');
      await page.goto(searchUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
      });

      // 로딩 대기
      await page.waitForTimeout(5000);
      
      // 페이지 정보 확인
      const pageTitle = await page.title();
      const pageUrl = page.url();
      console.log('📄 페이지 제목:', pageTitle);
      console.log('🌐 현재 URL:', pageUrl);
      
      // 스크린샷 저장
      await page.screenshot({ path: `dhgate-debug-${Date.now()}.png`, fullPage: true });
      
      // 페이지 내용 확인
      const pageContent = await page.evaluate(() => {
        const bodyText = document.body.textContent || '';
        return {
          bodyLength: bodyText.length,
          title: document.title,
          hasProducts: bodyText.includes('$') || bodyText.includes('price') || bodyText.includes('USD'),
          bodyPreview: bodyText.substring(0, 500)
        };
      });
      
      console.log('📄 페이지 내용 분석:', pageContent);
      
      // 단순한 상품 검색
      console.log('🔍 상품 요소 검색 중...');
      
      // 가장 기본적인 상품 추출
      const products = await page.evaluate(() => {
        const results: any[] = [];
        
        // 다양한 상품 셀렉터 시도
        const selectors = [
          '.stpro',
          '.search-prd',
          '.goods-item',
          '.item',
          '[class*="product"]',
          '[class*="item"]'
        ];
        
        let foundElements: NodeListOf<Element> | null = null;
        let usedSelector = '';
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          console.log(`셀렉터 "${selector}": ${elements.length}개 요소`);
          if (elements.length > 0) {
            foundElements = elements;
            usedSelector = selector;
            break;
          }
        }
        
        if (!foundElements || foundElements.length === 0) {
          console.log('❌ 상품 요소를 찾을 수 없음');
          
          // 페이지에서 가격 정보가 있는 모든 요소 찾기
          const priceElements = document.querySelectorAll('*');
          let priceCount = 0;
          Array.from(priceElements).forEach(el => {
            const text = el.textContent || '';
            if (text.includes('$') && text.match(/\$\s*\d+/)) {
              priceCount++;
            }
          });
          
          console.log(`페이지에서 발견된 가격 요소: ${priceCount}개`);
          
          return [];
        }
        
        console.log(`✅ "${usedSelector}"로 ${foundElements.length}개 요소 발견`);
        
        // 상위 5개 요소 처리
        Array.from(foundElements).slice(0, 5).forEach((element, index) => {
          try {
            // 제목 찾기
            const titleEl = element.querySelector('a[title], a, h1, h2, h3, .title, .name') as HTMLElement;
            const title = titleEl ? (titleEl.getAttribute('title') || titleEl.textContent?.trim() || '') : '';
            
            // 가격 찾기
            const priceEl = element.querySelector('*') as HTMLElement;
            let priceText = '';
            if (priceEl) {
              const allText = priceEl.textContent || '';
              const priceMatch = allText.match(/\$\s*([\d.,]+)/);
              priceText = priceMatch ? priceMatch[0] : '';
            }
            
            // URL 찾기
            const linkEl = element.querySelector('a') as HTMLAnchorElement;
            const productUrl = linkEl ? linkEl.href : '';
            
            if (title && priceText) {
              const priceMatch = priceText.match(/\$\s*([\d.,]+)/);
              const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;
              
              if (price > 0) {
                results.push({
                  id: `dhgate_simple_${Date.now()}_${index}`,
                  title: title.substring(0, 100),
                  price,
                  currency: 'USD',
                  imageUrl: '',
                  productUrl: productUrl.startsWith('http') ? productUrl : `https://www.dhgate.com${productUrl}`,
                  seller: {
                    name: 'DHgate Seller',
                    rating: undefined,
                    trustLevel: 'Medium'
                  },
                  site: 'dhgate',
                  minOrder: 1,
                  shipping: 'Free Shipping'
                });
                
                console.log(`✅ 상품 ${index + 1}: ${title.substring(0, 30)}... - ${priceText}`);
              }
            }
          } catch (error) {
            console.error(`상품 ${index} 처리 오류:`, error);
          }
        });
        
        console.log(`🎯 총 ${results.length}개 상품 추출`);
        return results;
      });

      // KRW 변환
      const productsWithKRW = await Promise.all(
        products.map(async (product: any) => ({
          ...product,
          priceKRW: await convertToKRW(product.price, 'USD')
        }))
      );

      console.log(`✅ DHgate에서 ${productsWithKRW.length}개 상품 발견`);
      
      return {
        query: keyword,
        totalResults: productsWithKRW.length,
        products: productsWithKRW,
        site: 'dhgate',
        searchTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ DHgate 검색 오류:', error);
      throw error;
    } finally {
      if (page) await page.close();
      await browser.close();
    }
  }, 3, 2000);
}

export async function analyzeDHgateProduct(url: string): Promise<any> {
  return await retryWithBackoff(async () => {
    const browser = await createStealthBrowser();
    let page;
    
    try {
      console.log('🔍 DHgate 상품 분석:', url);
      
      page = await createStealthPage(browser);
      
      await page.goto(url, { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });

      await randomDelay(3000, 5000);

      const productData = await page.evaluate(() => {
        // 제목 추출
        const titleSelectors = [
          '.product-name h1',
          '.item-title',
          'h1',
          '.goods-title'
        ];
        
        let title = '';
        for (const selector of titleSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            title = el.textContent?.trim() || '';
            if (title) break;
          }
        }

        // 가격 추출
        const priceSelectors = [
          '.price-now',
          '.current-price',
          '.item-price',
          '.price'
        ];
        
        let priceText = '';
        for (const selector of priceSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            priceText = el.textContent?.trim() || '';
            if (priceText) break;
          }
        }

        // 설명 추출
        const descSelectors = [
          '.product-description',
          '.item-description',
          '.goods-description'
        ];
        
        let description = '';
        for (const selector of descSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            description = el.textContent?.trim() || '';
            if (description) break;
          }
        }

        // 판매자 정보
        const sellerSelectors = [
          '.seller-info .name',
          '.store-name',
          '.shop-name'
        ];
        
        let sellerName = '';
        for (const selector of sellerSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            sellerName = el.textContent?.trim() || '';
            if (sellerName) break;
          }
        }

        // 이미지 수집
        const imageUrls: string[] = [];
        const imgElements = document.querySelectorAll('.product-gallery img, .item-images img, .goods-images img');
        imgElements.forEach(img => {
          const src = (img as HTMLImageElement).src || img.getAttribute('data-src');
          if (src && !src.includes('placeholder')) {
            imageUrls.push(src.startsWith('//') ? `https:${src}` : src);
          }
        });

        const priceMatch = priceText.match(/\$?([\d.,]+)/);
        const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;

        return {
          title,
          description,
          price,
          currency: 'USD',
          seller: {
            name: sellerName
          },
          site: 'dhgate',
          imageUrls,
          originalUrl: window.location.href
        };
      });

             const finalProductData = {
         ...productData,
         priceKRW: productData.price > 0 ? await convertToKRW(productData.price, 'USD') : 0
       };

             console.log('✅ DHgate 상품 분석 완료');
       return finalProductData;

    } catch (error) {
      console.error('❌ DHgate 상품 분석 오류:', error);
      throw new Error('DHgate 상품 정보를 가져올 수 없습니다.');
    } finally {
      if (page) await page.close();
      await browser.close();
    }
  });
} 