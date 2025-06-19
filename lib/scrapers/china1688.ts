import { 
  createStealthBrowser, 
  createStealthPage, 
  randomDelay, 
  waitForAnySelector, 
  scrollToLoadContent,
  retryWithBackoff,
  getRandomUserAgent
} from '../playwright-utils';
import { Product, SearchResult } from '../types';
import { convertToKRW } from '../exchange';

export async function search1688(keyword: string): Promise<SearchResult> {
  const startTime = Date.now();
  
  return await retryWithBackoff(async () => {
    const browser = await createStealthBrowser();
    let page;
    
    try {
      console.log('🔍 1688 검색 시작:', keyword);
      
      page = await createStealthPage(browser);
      
      // 1688 전용 설정 (중국 사이트)
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'userAgent', {
          get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        
        Object.defineProperty(navigator, 'language', {
          get: () => 'zh-CN',
        });
        
        Object.defineProperty(navigator, 'languages', {
          get: () => ['zh-CN', 'zh', 'en'],
        });
      });

      // 추가 헤더 설정
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
      });

      // 1688 검색 URL (공개 접근 가능한 페이지 시도)
      const searchUrls = [
        `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(keyword)}`,
        `https://www.1688.com/huo/${encodeURIComponent(keyword)}.html`,
        `https://search.1688.com/service/marketOfferResultViewService?keywords=${encodeURIComponent(keyword)}`
      ];

      let searchResult = null;
      
      // 여러 URL 시도
      for (const searchUrl of searchUrls) {
        try {
          console.log(`🔗 1688 URL 시도: ${searchUrl}`);
          
          await page.goto(searchUrl, { 
            waitUntil: 'networkidle', 
            timeout: 30000 
          });

          await randomDelay(3000, 5000);

          // 로그인 페이지인지 확인
          const isLoginPage = await page.evaluate(() => {
            const url = window.location.href;
            const title = document.title;
            const bodyText = document.body.textContent || '';
            
            return url.includes('login') || 
                   title.includes('登录') ||
                   title.includes('Login') ||
                   bodyText.includes('登录') ||
                   bodyText.includes('请登录');
          });

          if (isLoginPage) {
            console.log('⚠️ 1688 로그인 페이지 감지 - 다른 URL 시도');
            continue;
          }

          // 상품 리스트 확인
          const productSelectors = [
            '.sw-mod-item',
            '.offer-item',
            '.item',
            '.list-item',
            '.product-item'
          ];

          const foundSelector = await waitForAnySelector(page, productSelectors, 10000);
          
          if (foundSelector) {
            searchResult = await extractProducts(page);
            break;
          } else {
            // 스크롤 시도
            await scrollToLoadContent(page);
            await randomDelay(2000, 3000);
            
            const foundAfterScroll = await waitForAnySelector(page, productSelectors, 5000);
            if (foundAfterScroll) {
              searchResult = await extractProducts(page);
              break;
            }
          }
          
                 } catch (error) {
           console.log(`❌ URL ${searchUrl} 실패:`, error instanceof Error ? error.message : String(error));
           continue;
         }
      }

      if (!searchResult || searchResult.length === 0) {
        console.log('⚠️ 1688 상품 추출 실패 - 빈 결과 반환');
        return {
          query: keyword,
          totalResults: 0,
          products: [],
          site: '1688',
          searchTime: Date.now() - startTime
        };
      }

      // KRW 변환
      const productsWithKRW = await Promise.all(
        searchResult.map(async (product: any) => ({
          ...product,
          priceKRW: await convertToKRW(product.price, 'CNY')
        }))
      );

      console.log(`✅ 1688에서 ${productsWithKRW.length}개 상품 발견`);
      
      return {
        query: keyword,
        totalResults: productsWithKRW.length,
        products: productsWithKRW,
        site: '1688',
        searchTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ 1688 검색 오류:', error);
      return {
        query: keyword,
        totalResults: 0,
        products: [],
        site: '1688',
        searchTime: Date.now() - startTime
      };
    } finally {
      if (page) await page.close();
      await browser.close();
    }
  }, 2, 3000); // 재시도 2회, 3초 간격
}

// 상품 정보 추출 함수
async function extractProducts(page: any): Promise<any[]> {
  return await page.evaluate(() => {
    const productElements = document.querySelectorAll('.sw-mod-item, .offer-item, .item, .list-item, .product-item');
    const results: any[] = [];

    console.log(`1688 발견된 상품 요소 수: ${productElements.length}`);

    productElements.forEach((element, index) => {
      if (index >= 5) return; // 상위 5개만

      try {
        // 제목 추출
        const titleSelectors = [
          '.sw-mod-item-title a',
          '.offer-title a',
          '.item-title a',
          'h2 a',
          'h3 a',
          'a[title]'
        ];
        
        let title = '';
        let productUrl = '';
        for (const selector of titleSelectors) {
          const titleEl = element.querySelector(selector) as HTMLAnchorElement;
          if (titleEl) {
            title = titleEl.textContent?.trim() || titleEl.getAttribute('title')?.trim() || '';
            productUrl = titleEl.href || '';
            if (title) break;
          }
        }

        // 가격 추출
        const priceSelectors = [
          '.sw-mod-item-price',
          '.offer-price',
          '.item-price',
          '.price',
          '.cost'
        ];
        
        let priceText = '';
        for (const selector of priceSelectors) {
          const priceEl = element.querySelector(selector);
          if (priceEl) {
            priceText = priceEl.textContent?.trim() || '';
            if (priceText) break;
          }
        }

        // 이미지 추출
        const imgSelectors = [
          '.sw-mod-item-pic img',
          '.offer-image img',
          '.item-pic img',
          'img'
        ];
        
        let imageUrl = '';
        for (const selector of imgSelectors) {
          const imgEl = element.querySelector(selector) as HTMLImageElement;
          if (imgEl) {
            imageUrl = imgEl.src || imgEl.getAttribute('data-src') || '';
            if (imageUrl && !imageUrl.includes('placeholder')) break;
          }
        }

        // 판매자 정보
        const sellerSelectors = ['.supplier-name', '.seller-name', '.shop-name'];
        let sellerName = '';
        for (const selector of sellerSelectors) {
          const sellerEl = element.querySelector(selector);
          if (sellerEl) {
            sellerName = sellerEl.textContent?.trim() || '';
            if (sellerName) break;
          }
        }

        if (title && priceText) {
          // 가격 파싱 (¥1.50 또는 1.50元 형태)
          const priceMatch = priceText.match(/([\d.,]+)/);
          const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;

          if (price > 0) {
            results.push({
              id: `1688_${index}`,
              title,
              price,
              currency: 'CNY',
              imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https:${imageUrl}`) : '',
              productUrl: productUrl ? (productUrl.startsWith('http') ? productUrl : `https:${productUrl}`) : '',
              seller: {
                name: sellerName,
                trustLevel: 'Medium'
              },
              site: '1688',
              minOrder: 1,
              shipping: 'Contact Supplier'
            });
          }
        }
      } catch (error) {
        console.error(`1688 상품 ${index} 파싱 오류:`, error);
      }
    });

    return results;
  });
}

export async function analyze1688Product(url: string): Promise<any> {
  return await retryWithBackoff(async () => {
    const browser = await createStealthBrowser();
    let page;
    
    try {
      console.log('🔍 1688 상품 분석:', url);
      
      page = await createStealthPage(browser);
      
      // 중국어 설정
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      });
      
      await page.goto(url, { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });

      await randomDelay(3000, 5000);

      // 로그인 페이지 확인
      const isLoginPage = await page.evaluate(() => {
        const url = window.location.href;
        return url.includes('login') || document.body.textContent?.includes('登录');
      });

      if (isLoginPage) {
        throw new Error('1688 product page requires login');
      }

      const productData = await page.evaluate(() => {
        // 제목 추출
        const titleSelectors = [
          '.product-title h1',
          '.offer-title',
          'h1',
          '.title'
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
          '.price-current',
          '.offer-price',
          '.price',
          '.cost'
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
          '.offer-description',
          '.description'
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
          '.supplier-name',
          '.company-name',
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
        const imgElements = document.querySelectorAll('.product-gallery img, .offer-images img');
        imgElements.forEach(img => {
          const src = (img as HTMLImageElement).src || img.getAttribute('data-src');
          if (src && !src.includes('placeholder')) {
            imageUrls.push(src.startsWith('//') ? `https:${src}` : src);
          }
        });

        const priceMatch = priceText.match(/([\d.,]+)/);
        const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;

        return {
          title,
          description,
          price,
          currency: 'CNY',
          seller: {
            name: sellerName
          },
          site: '1688',
          imageUrls,
          originalUrl: window.location.href
        };
      });

      const finalProductData = {
        ...productData,
        priceKRW: productData.price > 0 ? await convertToKRW(productData.price, 'CNY') : 0
      };

      console.log('✅ 1688 상품 분석 완료');
      return finalProductData;

    } catch (error) {
      console.error('❌ 1688 상품 분석 오류:', error);
      throw new Error('1688 상품 정보를 가져올 수 없습니다.');
    } finally {
      if (page) await page.close();
      await browser.close();
    }
  }, 2, 3000);
} 