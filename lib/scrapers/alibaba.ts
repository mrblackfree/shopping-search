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

export async function searchAlibaba(keyword: string): Promise<SearchResult> {
  const startTime = Date.now();
  
  return await retryWithBackoff(async () => {
    const browser = await createStealthBrowser();
    let page;
    
    try {
      console.log('🔍 Alibaba 검색 시작:', keyword);
      
      page = await createStealthPage(browser);
      
      // Alibaba 전용 설정
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'userAgent', {
          get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        
        // 추가 봇 감지 우회
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
        
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
      });

      const searchUrl = `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(keyword)}`;
      
      // 페이지 로드 (더 긴 타임아웃)
      await page.goto(searchUrl, { 
        waitUntil: 'networkidle', 
        timeout: 45000 
      });

      // 자연스러운 딜레이
      await randomDelay(4000, 7000);

      // 캡차나 차단 페이지 확인
      const isBlocked = await page.evaluate(() => {
        const url = window.location.href;
        const title = document.title;
        return url.includes('punish') || 
               url.includes('captcha') || 
               title.includes('Access Denied') || 
               title.includes('Captcha') ||
               document.body.textContent?.includes('Please verify you are human');
      });

      if (isBlocked) {
        console.log('⚠️ Alibaba 봇 감지 - 다른 방법 시도');
        throw new Error('Alibaba bot detection triggered');
      }

      // 상품 리스트가 로드될 때까지 대기
      const productSelectors = [
        '.organic-list-item',
        '.gallery-offer-item',
        '.list-no-v2-item',
        '.product-item',
        '[data-spm-anchor-id]'
      ];

      const foundSelector = await waitForAnySelector(page, productSelectors, 20000);
      
      if (!foundSelector) {
        // 스크롤하여 동적 콘텐츠 로드 시도
        console.log('상품 리스트 로딩 중... 스크롤 시도');
        await scrollToLoadContent(page);
        await randomDelay(3000, 5000);
      }

      // 상품 정보 추출
      const products = await page.evaluate(() => {
        const productElements = document.querySelectorAll('.organic-list-item, .gallery-offer-item, .list-no-v2-item, .product-item, [data-spm-anchor-id]');
        const results: any[] = [];

        console.log(`발견된 상품 요소 수: ${productElements.length}`);

        productElements.forEach((element, index) => {
          if (index >= 5) return; // 상위 5개만

          try {
            // 제목 추출 (여러 셀렉터 시도)
            const titleSelectors = [
              '.elements-title-normal__content',
              '.organic-offer-title',
              '.title',
              'h2',
              'h3',
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
              '.price-current',
              '.price-now',
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
              '.organic-offer-image img',
              '.product-image img',
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
            const sellerSelectors = ['.supplier-name', '.seller-name', '.company-name'];
            let sellerName = '';
            for (const selector of sellerSelectors) {
              const sellerEl = element.querySelector(selector);
              if (sellerEl) {
                sellerName = sellerEl.textContent?.trim() || '';
                if (sellerName) break;
              }
            }

            // MOQ (최소 주문량) 추출
            const moqSelectors = ['.min-order', '.moq', '.minimum-order'];
            let minOrderText = '';
            for (const selector of moqSelectors) {
              const moqEl = element.querySelector(selector);
              if (moqEl) {
                minOrderText = moqEl.textContent?.trim() || '';
                if (minOrderText) break;
              }
            }

            if (title && priceText) {
              // 가격 파싱 ($1.50-$2.30 형태)
              const priceMatch = priceText.match(/\$?([\d.,]+)/);
              const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;

              // MOQ 파싱
              const moqMatch = minOrderText.match(/(\d+)/);
              const minOrder = moqMatch ? parseInt(moqMatch[1]) : 1;

              if (price > 0) {
                results.push({
                  id: `alibaba_${index}`,
                  title,
                  price,
                  currency: 'USD',
                  imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https:${imageUrl}`) : '',
                  productUrl: productUrl ? (productUrl.startsWith('http') ? productUrl : `https://www.alibaba.com${productUrl}`) : '',
                  seller: {
                    name: sellerName,
                    trustLevel: 'Medium'
                  },
                  site: 'alibaba',
                  minOrder,
                  shipping: 'Contact Supplier'
                });
              }
            }
          } catch (error) {
            console.error(`상품 ${index} 파싱 오류:`, error);
          }
        });

        return results;
      });

      // KRW 변환
      const productsWithKRW = await Promise.all(
        products.map(async (product: any) => ({
          ...product,
          priceKRW: await convertToKRW(product.price, 'USD')
        }))
      );

      console.log(`✅ Alibaba에서 ${productsWithKRW.length}개 상품 발견`);
      
      return {
        query: keyword,
        totalResults: productsWithKRW.length,
        products: productsWithKRW,
        site: 'alibaba',
        searchTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Alibaba 검색 오류:', error);
      return {
        query: keyword,
        totalResults: 0,
        products: [],
        site: 'alibaba',
        searchTime: Date.now() - startTime
      };
    } finally {
      if (page) await page.close();
      await browser.close();
    }
  }, 2, 2000); // 재시도 2회, 2초 간격
}

export async function analyzeAlibabaProduct(url: string): Promise<any> {
  return await retryWithBackoff(async () => {
    const browser = await createStealthBrowser();
    let page;
    
    try {
      console.log('🔍 Alibaba 상품 분석:', url);
      
      page = await createStealthPage(browser);
      
      await page.goto(url, { 
        waitUntil: 'networkidle', 
        timeout: 45000 
      });

      await randomDelay(4000, 7000);

      // 캡차 확인
      const isBlocked = await page.evaluate(() => {
        const url = window.location.href;
        return url.includes('punish') || url.includes('captcha');
      });

      if (isBlocked) {
        throw new Error('Alibaba product page blocked');
      }

      const productData = await page.evaluate(() => {
        // 제목 추출
        const titleSelectors = [
          '.product-title h1',
          '.product-name',
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
          '.price-now',
          '.price-range',
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
          '.product-detail',
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
          '.seller-name'
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
        const imgElements = document.querySelectorAll('.product-gallery img, .product-images img');
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
          site: 'alibaba',
          imageUrls,
          originalUrl: window.location.href
        };
      });

      const finalProductData = {
        ...productData,
        priceKRW: productData.price > 0 ? await convertToKRW(productData.price, 'USD') : 0
      };

      console.log('✅ Alibaba 상품 분석 완료');
      return finalProductData;

    } catch (error) {
      console.error('❌ Alibaba 상품 분석 오류:', error);
      throw new Error('Alibaba 상품 정보를 가져올 수 없습니다.');
    } finally {
      if (page) await page.close();
      await browser.close();
    }
  }, 2, 2000);
} 