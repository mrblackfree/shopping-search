import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product, SearchResult } from '../types';
import { convertToKRW } from '../exchange';

// 프록시 서버 목록 (무료 프록시 예시)
const proxyList = [
  // 실제 환경에서는 유료 프록시 서비스 사용 권장
  null, // 직접 연결도 시도
];

// 더 다양한 User-Agent (실제 브라우저 패턴)
const advancedUserAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

// 세션 쿠키 관리
let sessionCookies = {};

// 랜덤 딜레이 (더 긴 대기)
const advancedDelay = (min: number, max: number) => 
  new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));

// DHgate API 엔드포인트 시도
const getDHgateApiUrls = (keyword: string) => [
  // 모바일 API (덜 감지됨)
  `https://m.dhgate.com/wholesale/search.do?searchkey=${encodeURIComponent(keyword)}&catalog=`,
  // 일반 검색
  `https://www.dhgate.com/wholesale/search.do?searchkey=${encodeURIComponent(keyword)}&catalog=`,
  // 카테고리별 검색
  `https://www.dhgate.com/w/${encodeURIComponent(keyword)}/`,
  // 직접 상품 리스트
  `https://seller.dhgate.com/promowholesale/search.do?searchkey=${encodeURIComponent(keyword)}`
];

export async function searchDHgateAdvanced(keyword: string): Promise<SearchResult> {
  const startTime = Date.now();
  
  try {
    console.log('🚀 DHgate 고급 크롤링 시작:', keyword);
    
    const urls = getDHgateApiUrls(keyword);
    let realProducts: Product[] = [];
    
    for (let urlIndex = 0; urlIndex < urls.length && realProducts.length === 0; urlIndex++) {
      const url = urls[urlIndex];
      console.log(`🌐 DHgate 고급 URL ${urlIndex + 1}/${urls.length}:`, url);
      
      // 여러 User-Agent로 시도
      for (let agentIndex = 0; agentIndex < advancedUserAgents.length && realProducts.length === 0; agentIndex++) {
        const userAgent = advancedUserAgents[agentIndex];
        
        try {
          console.log(`🤖 User-Agent ${agentIndex + 1}: ${userAgent.substring(0, 50)}...`);
          
          // 더 정교한 헤더 설정
          const headers = {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8,zh;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'DNT': '1',
            'Sec-GPC': '1',
            // 실제 브라우저처럼 보이게 하는 헤더들
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
          };
          
          // 세션 쿠키가 있으면 추가
          if (Object.keys(sessionCookies).length > 0) {
            headers['Cookie'] = Object.entries(sessionCookies)
              .map(([key, value]) => `${key}=${value}`)
              .join('; ');
          }
          
          const response = await axios.get(url, {
            headers,
            timeout: 30000,
            maxRedirects: 5,
            validateStatus: (status) => status < 500,
            // 압축 해제 자동 처리
            decompress: true
          });
          
          console.log(`📄 DHgate 고급 응답: ${response.status}, 크기: ${response.data.length}bytes`);
          
          // 쿠키 저장
          if (response.headers['set-cookie']) {
            response.headers['set-cookie'].forEach(cookie => {
              const [nameValue] = cookie.split(';');
              const [name, value] = nameValue.split('=');
              if (name && value) {
                sessionCookies[name.trim()] = value.trim();
              }
            });
          }
          
          if (response.status === 200 && response.data.length > 2000) {
            const $ = cheerio.load(response.data);
            
            // 페이지 분석
            const title = $('title').text();
            const bodyText = $('body').text();
            
            console.log('📄 DHgate 페이지 분석:', title.substring(0, 80));
            
            // 더 정교한 차단 감지
            const blockPatterns = [
              /blocked/i, /captcha/i, /robot/i, /verification/i,
              /access.*denied/i, /forbidden/i, /suspicious/i,
              /请输入验证码/i, /验证/i, /机器人/i
            ];
            
            const isBlocked = blockPatterns.some(pattern => 
              pattern.test(title) || pattern.test(bodyText.substring(0, 1000))
            );
            
            if (isBlocked) {
              console.log('⚠️ DHgate 차단 감지, 다른 방법 시도...');
              await advancedDelay(5000, 8000); // 더 긴 대기
              continue;
            }
            
            // JSON 데이터 추출 시도 (SPA 사이트 대응)
            const scriptTags = $('script[type="application/json"], script:contains("window.__INITIAL_STATE__"), script:contains("window.runParams")');
            
            scriptTags.each((i, script) => {
              try {
                const scriptContent = $(script).html();
                if (scriptContent && scriptContent.includes('offer') && scriptContent.includes('price')) {
                  console.log('📦 JSON 데이터 발견, 파싱 시도...');
                  // JSON 파싱 로직은 복잡하므로 일단 스킵
                }
              } catch (e) {
                // JSON 파싱 실패는 무시
              }
            });
            
            // 기존 HTML 파싱 방식도 시도
            const productSelectors = [
              '.stpro', '.search-prd', '.goods-item', '.product-item',
              '.item-info', '.pro-item', '.search-item',
              '[data-testid*="product"]', '.product-card',
              '.item', '.product', '.offer-item',
              // 모바일 버전 셀렉터
              '.m-item', '.mobile-item', '.list-item'
            ];
            
            for (const selector of productSelectors) {
              const elements = $(selector);
              
              if (elements.length > 0) {
                console.log(`🎯 DHgate 셀렉터 "${selector}": ${elements.length}개 요소 발견`);
                
                elements.each((index, element) => {
                  if (index >= 10) return false; // 최대 10개
                  
                  try {
                    const $el = $(element);
                    
                    // 더 정교한 제목 추출
                    let title = '';
                    let productUrl = '';
                    
                    const titleSelectors = [
                      'a[title]', '.item-title a', '.product-title a',
                      '.title a', '.name a', 'h1 a', 'h2 a', 'h3 a',
                      'a[href*="product"]', 'a[href*="offer"]',
                      '.offer-title a', '.goods-title a'
                    ];
                    
                    for (const sel of titleSelectors) {
                      const el = $el.find(sel).first();
                      if (el.length > 0) {
                        title = el.attr('title') || el.text().trim();
                        productUrl = el.attr('href') || '';
                        if (title && title.length > 10) break;
                      }
                    }
                    
                    // 더 정교한 가격 추출
                    let price = 0;
                    const priceSelectors = [
                      '.item-price', '.price-current', '.price-now',
                      '.cost', '.price', '.sale-price', '.current-price',
                      '[class*="price"]', '[data-price]', '.offer-price'
                    ];
                    
                    for (const sel of priceSelectors) {
                      const el = $el.find(sel).first();
                      if (el.length > 0) {
                        const priceText = el.text().trim() || el.attr('data-price') || '';
                        
                        const pricePatterns = [
                          /\$\s*([\d.,]+)/g, /USD\s*([\d.,]+)/g,
                          /([\d.,]+)\s*\$/g, /([\d.,]+)\s*USD/g,
                          /Price:\s*\$?([\d.,]+)/gi,
                          /现价.*?(\d+\.?\d*)/g
                        ];
                        
                        for (const pattern of pricePatterns) {
                          const matches = [...priceText.matchAll(pattern)];
                          if (matches.length > 0) {
                            price = parseFloat(matches[0][1].replace(',', ''));
                            if (price > 0) break;
                          }
                        }
                        
                        if (price > 0) break;
                      }
                    }
                    
                    // 이미지 추출
                    let imageUrl = '';
                    const imgSelectors = [
                      'img[src*="dhgate"]', '.item-pic img',
                      '.product-image img', '.image img',
                      'img[data-src]', 'img[data-original]', 'img'
                    ];
                    
                    for (const sel of imgSelectors) {
                      const el = $el.find(sel).first();
                      if (el.length > 0) {
                        imageUrl = el.attr('src') || el.attr('data-src') || el.attr('data-original') || '';
                        if (imageUrl && !imageUrl.includes('placeholder') && !imageUrl.includes('loading')) {
                          break;
                        }
                      }
                    }
                    
                    // 유효한 상품인지 확인
                    if (title && title.length > 10 && price > 0) {
                      const product: Product = {
                        id: `dhgate_advanced_real_${Date.now()}_${index}`,
                        title: title.substring(0, 200),
                        price,
                        currency: 'USD',
                        priceKRW: 0,
                        imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https:${imageUrl}`) : '',
                        productUrl: productUrl ? (productUrl.startsWith('http') ? productUrl : `https://www.dhgate.com${productUrl}`) : '',
                        seller: {
                          name: 'DHgate Advanced Seller',
                          rating: 4.0 + Math.random(),
                          trustLevel: 'Medium'
                        },
                        site: 'dhgate',
                        minOrder: 1,
                        shipping: 'Free Shipping'
                      };
                      
                      realProducts.push(product);
                      console.log(`✅ DHgate 고급 크롤링 성공 ${realProducts.length}: ${title.substring(0, 40)}... - $${price}`);
                    }
                  } catch (parseError: any) {
                    console.log(`DHgate 상품 파싱 오류:`, parseError.message);
                  }
                });
                
                if (realProducts.length > 0) {
                  console.log(`🎉 DHgate 고급 크롤링 성공! ${realProducts.length}개 상품 추출`);
                  break;
                }
              }
            }
            
            if (realProducts.length > 0) break;
          }
          
        } catch (error: any) {
          console.log(`❌ DHgate User-Agent ${agentIndex + 1} 실패:`, error.message);
        }
        
        // User-Agent 간 딜레이
        if (agentIndex < advancedUserAgents.length - 1) {
          await advancedDelay(3000, 6000);
        }
      }
      
      // URL 간 딜레이
      if (urlIndex < urls.length - 1) {
        await advancedDelay(5000, 10000);
      }
    }
    
    // 실제 크롤링 성공 시
    if (realProducts.length > 0) {
      const productsWithKRW = await Promise.all(
        realProducts.map(async (product) => ({
          ...product,
          priceKRW: await convertToKRW(product.price, 'USD')
        }))
      );
      
      console.log(`🎉 DHgate 고급 크롤링 최종 성공: ${productsWithKRW.length}개 상품`);
      
      return {
        query: keyword,
        totalResults: productsWithKRW.length,
        products: productsWithKRW,
        site: 'dhgate',
        searchTime: Date.now() - startTime
      };
    }
    
    // 모든 시도 실패 시 빈 결과 반환
    console.log('❌ DHgate 고급 크롤링 완전 실패');
    return {
      query: keyword,
      totalResults: 0,
      products: [],
      site: 'dhgate',
      searchTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('❌ DHgate 고급 크롤링 오류:', error);
    
    return {
      query: keyword,
      totalResults: 0,
      products: [],
      site: 'dhgate',
      searchTime: Date.now() - startTime
    };
  }
} 