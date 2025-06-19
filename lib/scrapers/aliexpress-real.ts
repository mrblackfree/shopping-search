import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product, SearchResult } from '../types';
import { convertToKRW } from '../exchange';

// AliExpress는 상대적으로 크롤링이 용이한 사이트
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

const randomDelay = (min: number, max: number) => 
  new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));

// AliExpress 검색 URL들
const getAliExpressUrls = (keyword: string) => [
  `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(keyword)}`,
  `https://m.aliexpress.com/wholesale/${encodeURIComponent(keyword)}.html`,
  `https://www.aliexpress.us/wholesale?SearchText=${encodeURIComponent(keyword)}`,
  `https://aliexpress.com/item/${encodeURIComponent(keyword)}.html`
];

export async function searchAliExpressReal(keyword: string): Promise<SearchResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 AliExpress 실제 크롤링 시작:', keyword);
    
    const urls = getAliExpressUrls(keyword);
    let realProducts: Product[] = [];
    
    for (let i = 0; i < urls.length && realProducts.length === 0; i++) {
      const url = urls[i];
      console.log(`🌐 AliExpress URL ${i + 1}/${urls.length}:`, url);
      
      try {
        const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': 'https://www.google.com/'
          },
          timeout: 20000,
          maxRedirects: 3,
          validateStatus: (status) => status < 500
        });
        
        console.log(`📄 AliExpress 응답: ${response.status}, 크기: ${response.data.length}bytes`);
        
        if (response.status === 200 && response.data.length > 1000) {
          const $ = cheerio.load(response.data);
          
          const pageTitle = $('title').text();
          console.log('📄 AliExpress 페이지:', pageTitle.substring(0, 100));
          
          // 차단 확인
          const blockKeywords = ['blocked', 'captcha', 'robot', 'verification'];
          const isBlocked = blockKeywords.some(kw => 
            pageTitle.toLowerCase().includes(kw) || 
            $('body').text().toLowerCase().includes(kw)
          );
          
          if (isBlocked) {
            console.log('⚠️ AliExpress 차단 감지');
            await randomDelay(3000, 5000);
            continue;
          }
          
          // AliExpress 상품 셀렉터들
          const productSelectors = [
            '.list-item',
            '.product-item',
            '.search-item',
            '.item',
            '[data-product-id]',
            '.card-item',
            '.goods-item'
          ];
          
          console.log('🔍 AliExpress 상품 검색 중...');
          
          for (const selector of productSelectors) {
            const elements = $(selector);
            console.log(`AliExpress 셀렉터 "${selector}": ${elements.length}개 요소`);
            
            if (elements.length > 0) {
              elements.each((index, element) => {
                if (index >= 8) return false;
                
                try {
                  const $el = $(element);
                  
                  // 제목 추출
                  let title = '';
                  let productUrl = '';
                  
                  const titleSelectors = [
                    'a[title]', '.item-title a', '.product-title a',
                    '.title a', 'h1 a', 'h2 a', 'h3 a',
                    'a[href*="item"]', 'a[href*="product"]'
                  ];
                  
                  for (const sel of titleSelectors) {
                    const el = $el.find(sel).first();
                    if (el.length > 0) {
                      title = el.attr('title') || el.text().trim();
                      productUrl = el.attr('href') || '';
                      if (title && title.length > 5) break;
                    }
                  }
                  
                  // 가격 추출
                  let price = 0;
                  const priceSelectors = [
                    '.price-current', '.price-now', '.price',
                    '.cost', '[class*="price"]', '.sale-price'
                  ];
                  
                  for (const sel of priceSelectors) {
                    const el = $el.find(sel).first();
                    if (el.length > 0) {
                      const priceText = el.text().trim();
                      
                      const pricePatterns = [
                        /\$\s*([\d.,]+)/,
                        /USD\s*([\d.,]+)/,
                        /([\d.,]+)\s*\$/,
                        /([\d.,]+)/
                      ];
                      
                      for (const pattern of pricePatterns) {
                        const match = priceText.match(pattern);
                        if (match) {
                          price = parseFloat(match[1].replace(',', ''));
                          if (price > 0) break;
                        }
                      }
                      
                      if (price > 0) break;
                    }
                  }
                  
                  // 이미지 추출
                  let imageUrl = '';
                  const imgEl = $el.find('img').first();
                  if (imgEl.length > 0) {
                    imageUrl = imgEl.attr('src') || imgEl.attr('data-src') || '';
                  }
                  
                  if (title && price > 0 && title.length > 5) {
                    const product: Product = {
                      id: `aliexpress_real_${Date.now()}_${index}`,
                      title: title.substring(0, 200),
                      price,
                      currency: 'USD',
                      priceKRW: 0,
                      imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https:${imageUrl}`) : '',
                      productUrl: productUrl ? (productUrl.startsWith('http') ? productUrl : `https://www.aliexpress.com${productUrl}`) : '',
                      seller: {
                        name: 'AliExpress Seller',
                        rating: 4.0 + Math.random(),
                        trustLevel: 'High'
                      },
                      site: 'aliexpress',
                      minOrder: 1,
                      shipping: 'Free Shipping'
                    };
                    
                    realProducts.push(product);
                    console.log(`✅ AliExpress 실제 상품 ${realProducts.length}: ${title.substring(0, 40)}... - $${price}`);
                  }
                } catch (parseError: any) {
                  console.log(`AliExpress 파싱 오류:`, parseError.message);
                }
              });
              
              if (realProducts.length > 0) {
                console.log(`🎯 AliExpress 셀렉터 "${selector}"로 ${realProducts.length}개 상품 추출!`);
                break;
              }
            }
          }
          
          if (realProducts.length > 0) {
            console.log(`🎉 AliExpress 실제 크롤링 성공! ${realProducts.length}개 상품`);
            break;
          }
        }
        
      } catch (error: any) {
        console.log(`❌ AliExpress URL ${i + 1} 실패:`, error.message);
      }
      
      if (i < urls.length - 1) {
        await randomDelay(2000, 4000);
      }
    }
    
    // 성공 시 KRW 변환
    if (realProducts.length > 0) {
      const productsWithKRW = await Promise.all(
        realProducts.map(async (product) => ({
          ...product,
          priceKRW: await convertToKRW(product.price, 'USD')
        }))
      );
      
      return {
        query: keyword,
        totalResults: productsWithKRW.length,
        products: productsWithKRW,
        site: 'aliexpress',
        searchTime: Date.now() - startTime
      };
    }
    
    // 실패 시 빈 결과
    console.log('❌ AliExpress 크롤링 실패');
    return {
      query: keyword,
      totalResults: 0,
      products: [],
      site: 'aliexpress',
      searchTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('❌ AliExpress 오류:', error);
    return {
      query: keyword,
      totalResults: 0,
      products: [],
      site: 'aliexpress',
      searchTime: Date.now() - startTime
    };
  }
} 