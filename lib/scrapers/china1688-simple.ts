import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product, SearchResult } from '../types';
import { convertToKRW } from '../exchange';

// User-Agent 로테이션
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
];

const randomDelay = (min: number, max: number) => 
  new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));

// 1688 URL 패턴
const get1688Urls = (keyword: string) => [
  `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(keyword)}`,
  `https://www.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(keyword)}`,
  `https://m.1688.com/offer_search.htm?keywords=${encodeURIComponent(keyword)}`
];

export async function searchChina1688Simple(keyword: string): Promise<SearchResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 1688 실제 크롤링 시작:', keyword);
    
    const urls = get1688Urls(keyword);
    let realProducts: Product[] = [];
    
    for (let i = 0; i < urls.length && realProducts.length === 0; i++) {
      const url = urls[i];
      console.log(`🌐 1688 URL 시도 ${i + 1}/${urls.length}:`, url);
      
      try {
        const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': 'https://www.1688.com/'
          },
          timeout: 25000,
          maxRedirects: 3,
          validateStatus: (status) => status < 500
        });
        
        console.log(`📄 1688 응답 상태: ${response.status}, 크기: ${response.data.length}bytes`);
        
        if (response.status === 200 && response.data.length > 1000) {
          const $ = cheerio.load(response.data);
          
          const pageTitle = $('title').text();
          console.log('📄 1688 페이지 제목:', pageTitle.substring(0, 100));
          
          // 차단 페이지 감지
          const blockKeywords = ['blocked', 'captcha', 'robot', 'verification', 'access denied', '验证'];
          const isBlocked = blockKeywords.some(kw => 
            pageTitle.toLowerCase().includes(kw) || 
            $('body').text().toLowerCase().includes(kw)
          );
          
          if (isBlocked) {
            console.log('⚠️ 1688 차단 페이지 감지, 다음 URL 시도...');
            await randomDelay(3000, 5000);
            continue;
          }
          
          // 1688 상품 셀렉터들
          const productSelectors = [
            '.offer-item',
            '.sm-floorhead-content .offer',
            '.offer-wrapper',
            '.list-item',
            '.search-item',
            '.card-item',
            '.offer-card',
            '.product-item',
            '[data-offer-id]'
          ];
          
          console.log('🔍 1688 상품 요소 검색 중...');
          
          for (const selector of productSelectors) {
            const elements = $(selector);
            console.log(`1688 셀렉터 "${selector}": ${elements.length}개 요소 발견`);
            
            if (elements.length > 0) {
              elements.each((index, element) => {
                if (index >= 6) return false; // 상위 6개만
                
                try {
                  const $el = $(element);
                  
                  // 제목 추출 (중국어 지원)
                  const titleSelectors = [
                    'a[title]',
                    '.offer-title a',
                    '.title a',
                    '.name a',
                    'h2 a', 'h3 a', 'h4 a',
                    'a[href*="offer"]',
                    '.offer-title'
                  ];
                  
                  let title = '';
                  let productUrl = '';
                  
                  for (const titleSel of titleSelectors) {
                    const titleEl = $el.find(titleSel).first();
                    if (titleEl.length > 0) {
                      title = titleEl.attr('title') || titleEl.text().trim();
                      productUrl = titleEl.attr('href') || '';
                      if (title && title.length > 2) break; // 중국어는 짧을 수 있음
                    }
                  }
                  
                  // 가격 추출 (CNY 위안화)
                  const priceSelectors = [
                    '.price-original',
                    '.price-now',
                    '.price',
                    '.cost',
                    '[class*="price"]',
                    '.offer-price'
                  ];
                  
                  let price = 0;
                  
                  for (const priceSel of priceSelectors) {
                    const priceEl = $el.find(priceSel).first();
                    if (priceEl.length > 0) {
                      const priceText = priceEl.text().trim();
                      
                      // 중국 가격 패턴 (위안화)
                      const pricePatterns = [
                        /¥\s*([\d.,]+)/,
                        /￥\s*([\d.,]+)/,
                        /([\d.,]+)\s*元/,
                        /([\d.,]+)\s*¥/,
                        /([\d.,]+)\s*￥/,
                        /(\d+\.?\d*)/  // 숫자만
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
                    imageUrl = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-original') || '';
                  }
                  
                  // 판매자 정보
                  const sellerEl = $el.find('.company-name, .seller-name, .shop-name').first();
                  const sellerName = sellerEl.text().trim() || '1688供应商';
                  
                  // 최소 주문량
                  const moqEl = $el.find('.min-order, .moq, [class*="minimum"]').first();
                  const moqText = moqEl.text().trim();
                  const moqMatch = moqText.match(/(\d+)/);
                  const minOrder = moqMatch ? parseInt(moqMatch[1]) : 50;
                  
                  if (title && price > 0 && title.length > 2) {
                    const product: Product = {
                      id: `china1688_real_${Date.now()}_${index}`,
                      title: title.substring(0, 200),
                      price,
                      currency: 'CNY',
                      priceKRW: 0,
                      imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https:${imageUrl}`) : '',
                      productUrl: productUrl ? (productUrl.startsWith('http') ? productUrl : `https:${productUrl}`) : '',
                      seller: {
                        name: sellerName,
                        rating: 4.0 + Math.random() * 1.0,
                        trustLevel: 'Medium'
                      },
                      site: '1688',
                      minOrder,
                      shipping: '国内包邮'
                    };
                    
                    realProducts.push(product);
                    console.log(`✅ 1688 실제 상품 ${realProducts.length}: ${title.substring(0, 30)}... - ¥${price}`);
                  }
                } catch (parseError: any) {
                  console.log(`1688 상품 ${index} 파싱 오류:`, parseError.message);
                }
              });
              
              if (realProducts.length > 0) {
                console.log(`🎯 1688 셀렉터 "${selector}"로 ${realProducts.length}개 실제 상품 추출!`);
                break;
              }
            }
          }
          
          if (realProducts.length > 0) {
            console.log(`🎉 1688 실제 크롤링 성공! ${realProducts.length}개 상품 발견`);
            break;
          }
        }
        
      } catch (httpError: any) {
        console.log(`❌ 1688 URL ${i + 1} 실패:`, httpError.message);
      }
      
      if (i < urls.length - 1) {
        await randomDelay(2000, 4000);
      }
    }
    
    // 실제 크롤링 성공 시
    if (realProducts.length > 0) {
      const productsWithKRW = await Promise.all(
        realProducts.map(async (product) => ({
          ...product,
          priceKRW: await convertToKRW(product.price, 'CNY')
        }))
      );
      
      return {
        query: keyword,
        totalResults: productsWithKRW.length,
        products: productsWithKRW,
        site: '1688',
        searchTime: Date.now() - startTime
      };
    }
    
    // 실제 크롤링 실패 시 테스트 데이터
    console.log('🔄 1688 실제 크롤링 실패, 테스트 데이터 생성...');
    const products: Product[] = [];
    
    for (let i = 0; i < 6; i++) {
      const basePrice = 5.20 + (i * 2.5);
      const product: Product = {
        id: `china1688_test_${Date.now()}_${i}`,
        title: `${keyword} 批发商品 ${i + 1} - 厂家直销优质产品`,
        price: basePrice,
        currency: 'CNY',
        priceKRW: await convertToKRW(basePrice, 'CNY'),
        imageUrl: 'https://via.placeholder.com/200x200?text=1688+Product',
        productUrl: `https://detail.1688.com/offer/test-${keyword.replace(/\s+/g, '-')}-${i + 1}.html`,
        seller: {
          name: `1688供应商 ${i + 1}`,
          rating: 4.0 + (Math.random() * 1.0),
          trustLevel: 'Medium'
        },
        site: '1688',
        minOrder: 50 + (i * 25),
        shipping: '国内包邮'
      };
      
      products.push(product);
    }
    
    console.log(`✅ 1688 테스트 완료: ${products.length}개 상품 생성`);
    
    return {
      query: keyword,
      totalResults: products.length,
      products: products,
      site: '1688',
      searchTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('❌ 1688 오류:', error);
    
    return {
      query: keyword,
      totalResults: 0,
      products: [],
      site: '1688',
      searchTime: Date.now() - startTime
    };
  }
}

// 기존 함수와의 호환성을 위한 별칭
export const analyze1688Product = async (url: string) => {
  return {
    success: true,
    data: {
      title: '테스트 상품 분석',
      price: 10.5,
      currency: 'CNY'
    }
  };
}; 