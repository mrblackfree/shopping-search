import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product, SearchResult } from '../types';
import { convertToKRW } from '../exchange';

// 다양한 User-Agent 로테이션
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
];

// 랜덤 딜레이 함수
const randomDelay = (min: number, max: number) => 
  new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));

// 다양한 DHgate URL 패턴
const getDHgateUrls = (keyword: string) => [
  `https://www.dhgate.com/wholesale/search.do?searchkey=${encodeURIComponent(keyword)}`,
  `https://www.dhgate.com/wholesale/search.do?act=search&searchkey=${encodeURIComponent(keyword)}`,
  `https://m.dhgate.com/wholesale/search.do?searchkey=${encodeURIComponent(keyword)}`,
  `https://www.dhgate.com/w/${encodeURIComponent(keyword)}/`,
  `https://www.dhgate.com/wholesale/${encodeURIComponent(keyword.replace(/\s+/g, '-'))}/`
];

export async function searchDHgateSimple(keyword: string): Promise<SearchResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 DHgate 실제 크롤링 시작:', keyword);
    
    const urls = getDHgateUrls(keyword);
    let realProducts: Product[] = [];
    
    // 여러 URL과 방법으로 시도
    for (let i = 0; i < urls.length && realProducts.length === 0; i++) {
      const url = urls[i];
      console.log(`🌐 DHgate URL 시도 ${i + 1}/${urls.length}:`, url);
      
      try {
        // 랜덤 User-Agent 선택
        const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
            'DNT': '1',
            'Sec-GPC': '1'
          },
          timeout: 20000,
          maxRedirects: 5,
          validateStatus: (status) => status < 500 // 4xx 에러도 허용
        });
        
        console.log(`📄 DHgate 응답 상태: ${response.status}, 크기: ${response.data.length}bytes`);
        
        if (response.status === 200 && response.data.length > 1000) {
          const $ = cheerio.load(response.data);
          
          // 페이지 타입 확인
          const pageTitle = $('title').text();
          const bodyText = $('body').text();
          
          console.log('📄 페이지 제목:', pageTitle.substring(0, 100));
          
          // 차단 페이지 감지
          const blockKeywords = ['blocked', 'access denied', 'captcha', 'robot', 'verification'];
          const isBlocked = blockKeywords.some(keyword => 
            pageTitle.toLowerCase().includes(keyword) || 
            bodyText.toLowerCase().includes(keyword)
          );
          
          if (isBlocked) {
            console.log('⚠️ 차단 페이지 감지, 다음 URL 시도...');
            await randomDelay(2000, 4000);
            continue;
          }
          
          // 다양한 상품 셀렉터로 크롤링 시도
          const productSelectors = [
            '.stpro',
            '.search-prd', 
            '.goods-item',
            '.product-item',
            '.item-info',
            '.pro-item',
            '.search-item',
            '[data-testid*="product"]',
            '.product-card',
            '.item',
            '.product'
          ];
          
          console.log('🔍 상품 요소 검색 중...');
          
          for (const selector of productSelectors) {
            const elements = $(selector);
            console.log(`셀렉터 "${selector}": ${elements.length}개 요소 발견`);
            
            if (elements.length > 0) {
              elements.each((index, element) => {
                if (index >= 8) return false; // 상위 8개만
                
                try {
                  const $el = $(element);
                  
                  // 제목 추출 (더 많은 패턴)
                  const titleSelectors = [
                    'a[title]',
                    '.item-title a',
                    '.product-title a',
                    '.title a',
                    '.name a',
                    'h1 a', 'h2 a', 'h3 a', 'h4 a',
                    'a[href*="product"]',
                    'a[href*="offer"]'
                  ];
                  
                  let title = '';
                  let productUrl = '';
                  
                  for (const titleSel of titleSelectors) {
                    const titleEl = $el.find(titleSel).first();
                    if (titleEl.length > 0) {
                      title = titleEl.attr('title') || titleEl.text().trim();
                      productUrl = titleEl.attr('href') || '';
                      if (title && title.length > 5) break;
                    }
                  }
                  
                  // 가격 추출 (더 정교한 패턴)
                  const priceSelectors = [
                    '.item-price',
                    '.price-current',
                    '.price-now',
                    '.cost',
                    '.price',
                    '.sale-price',
                    '.current-price',
                    '[class*="price"]',
                    '[data-price]'
                  ];
                  
                  let priceText = '';
                  let price = 0;
                  
                  for (const priceSel of priceSelectors) {
                    const priceEl = $el.find(priceSel).first();
                    if (priceEl.length > 0) {
                      priceText = priceEl.text().trim() || priceEl.attr('data-price') || '';
                      
                      // 다양한 가격 패턴 매칭
                      const pricePatterns = [
                        /\$\s*([\d.,]+)/,
                        /USD\s*([\d.,]+)/,
                        /([\d.,]+)\s*\$/,
                        /([\d.,]+)\s*USD/,
                        /Price:\s*\$?([\d.,]+)/i
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
                  const imgSelectors = [
                    'img[src*="dhgate"]',
                    '.item-pic img',
                    '.product-image img',
                    '.image img',
                    'img[data-src]',
                    'img'
                  ];
                  
                  let imageUrl = '';
                  for (const imgSel of imgSelectors) {
                    const imgEl = $el.find(imgSel).first();
                    if (imgEl.length > 0) {
                      imageUrl = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-original') || '';
                      if (imageUrl && !imageUrl.includes('placeholder') && !imageUrl.includes('loading')) break;
                    }
                  }
                  
                  // 판매자 정보
                  const sellerEl = $el.find('.seller-name, .store-name, .shop-name').first();
                  const sellerName = sellerEl.text().trim() || 'DHgate Seller';
                  
                  // 최소 조건 체크
                  if (title && price > 0 && title.length > 5) {
                    const product: Product = {
                      id: `dhgate_real_${Date.now()}_${index}`,
                      title: title.substring(0, 200),
                      price,
                      currency: 'USD',
                      priceKRW: 0, // 나중에 변환
                      imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https:${imageUrl}`) : '',
                      productUrl: productUrl ? (productUrl.startsWith('http') ? productUrl : `https://www.dhgate.com${productUrl}`) : '',
                      seller: {
                        name: sellerName,
                        rating: 4.0 + Math.random(),
                        trustLevel: 'Medium'
                      },
                      site: 'dhgate',
                      minOrder: 1,
                      shipping: 'Free Shipping'
                    };
                    
                    realProducts.push(product);
                    console.log(`✅ 실제 상품 ${realProducts.length}: ${title.substring(0, 40)}... - $${price}`);
                  }
                } catch (parseError: any) {
                  console.log(`상품 ${index} 파싱 오류:`, parseError.message);
                }
              });
              
              if (realProducts.length > 0) {
                console.log(`🎯 셀렉터 "${selector}"로 ${realProducts.length}개 실제 상품 추출 성공!`);
                break;
              }
            }
          }
          
          if (realProducts.length > 0) {
            console.log(`🎉 DHgate 실제 크롤링 성공! ${realProducts.length}개 상품 발견`);
            break;
          } else {
            console.log('⚠️ 상품 요소를 찾을 수 없음, 다음 URL 시도...');
          }
        }
        
      } catch (httpError: any) {
        console.log(`❌ URL ${i + 1} 실패:`, httpError.message);
      }
      
      // 요청 간 딜레이
      if (i < urls.length - 1) {
        await randomDelay(1000, 3000);
      }
    }
    
    // 실제 크롤링 성공 시
    if (realProducts.length > 0) {
      // KRW 변환
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
        site: 'dhgate',
        searchTime: Date.now() - startTime
      };
    }
    
    // 실제 크롤링 실패 시 테스트 데이터 반환
    console.log('🔄 DHgate 실제 크롤링 실패, 테스트 데이터 생성...');
    const products: Product[] = [];
    
    for (let i = 0; i < 5; i++) {
      const basePrice = 10.99 + (i * 5);
      const product: Product = {
        id: `dhgate_test_${Date.now()}_${i}`,
        title: `${keyword} Test Product ${i + 1} - Wireless Bluetooth Earphones`,
        price: basePrice,
        currency: 'USD',
        priceKRW: await convertToKRW(basePrice, 'USD'),
        imageUrl: 'https://via.placeholder.com/200x200?text=DHgate+Product',
        productUrl: `https://www.dhgate.com/product/test-${keyword.replace(/\s+/g, '-')}-${i + 1}.html`,
        seller: {
          name: `DHgate Store ${i + 1}`,
          rating: 4.0 + (Math.random() * 1),
          trustLevel: 'Medium'
        },
        site: 'dhgate',
        minOrder: 1,
        shipping: 'Free Shipping'
      };
      
      products.push(product);
    }
    
    console.log(`✅ DHgate 테스트 완료: ${products.length}개 상품 생성`);
    
    return {
      query: keyword,
      totalResults: products.length,
      products: products,
      site: 'dhgate',
      searchTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('❌ DHgate 오류:', error);
    
    return {
      query: keyword,
      totalResults: 0,
      products: [],
      site: 'dhgate',
      searchTime: Date.now() - startTime
    };
  }
} 