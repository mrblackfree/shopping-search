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
      
      // DHgate 전용 설정
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'userAgent', {
          get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
      });

      const searchUrl = `https://www.dhgate.com/wholesale/search.do?searchkey=${encodeURIComponent(keyword)}&catalog=`;
      
      // 페이지 로드
      await page.goto(searchUrl, { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });

      // 자연스러운 딜레이
      await randomDelay(3000, 5000);

      // 상품 리스트가 로드될 때까지 대기
      const productSelectors = [
        '.stpro',
        '.search-prd',
        '.goods-item',
        '.product-item',
        '.item-info'
      ];

      const foundSelector = await waitForAnySelector(page, productSelectors, 15000);
      
      if (!foundSelector) {
        // 스크롤하여 동적 콘텐츠 로드 시도
        console.log('상품 리스트 로딩 중... 스크롤 시도');
        await scrollToLoadContent(page);
        await randomDelay(3000, 5000);
      }

      // 상품 정보 추출
      const products = await page.evaluate(() => {
        const productElements = document.querySelectorAll('.stpro, .search-prd, .goods-item, .product-item, .item-info');
        const results: any[] = [];

        console.log(`발견된 상품 요소 수: ${productElements.length}`);

        productElements.forEach((element, index) => {
          if (index >= 5) return; // 상위 5개만

          try {
            // 제목 추출 (여러 셀렉터 시도)
            const titleSelectors = [
              '.item-title a',
              '.product-title a',
              'h2 a',
              'h3 a',
              'a[title]',
              '.goods-title a'
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
              '.item-price',
              '.price-current',
              '.price-now',
              '.cost',
              '.price'
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
              '.item-pic img',
              '.product-image img',
              '.goods-image img',
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
            const sellerSelectors = ['.seller-name', '.store-name', '.shop-name'];
            let sellerName = '';
            for (const selector of sellerSelectors) {
              const sellerEl = element.querySelector(selector);
              if (sellerEl) {
                sellerName = sellerEl.textContent?.trim() || '';
                if (sellerName) break;
              }
            }

            // 평점 정보
            const ratingSelectors = ['.seller-rating', '.store-rating', '.rating'];
            let ratingText = '';
            for (const selector of ratingSelectors) {
              const ratingEl = element.querySelector(selector);
              if (ratingEl) {
                ratingText = ratingEl.textContent?.trim() || '';
                if (ratingText) break;
              }
            }

            if (title && priceText) {
              // 가격 파싱
              const priceMatch = priceText.match(/\$?([\d.,]+)/);
              const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;

              // 평점 파싱
              const ratingMatch = ratingText.match(/([\d.]+)/);
              const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

              if (price > 0) {
                results.push({
                  id: `dhgate_${index}`,
                  title,
                  price,
                  currency: 'USD',
                  imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https:${imageUrl}`) : '',
                  productUrl: productUrl ? (productUrl.startsWith('http') ? productUrl : `https://www.dhgate.com${productUrl}`) : '',
                  seller: {
                    name: sellerName,
                    rating,
                    trustLevel: rating && rating > 4.5 ? 'High' : rating && rating > 3.5 ? 'Medium' : 'Low'
                  },
                  site: 'dhgate',
                  minOrder: 1,
                  shipping: 'Free Shipping'
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
      return {
        query: keyword,
        totalResults: 0,
        products: [],
        site: 'dhgate',
        searchTime: Date.now() - startTime
      };
    } finally {
      if (page) await page.close();
      await browser.close();
    }
  });
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