import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product, SearchResult } from '../types';
import { convertToKRW } from '../exchange';

const CHINA1688_SEARCH_URL = 'https://s.1688.com/selloffer/offer_search.htm';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

export async function searchChina1688(keyword: string): Promise<SearchResult> {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(CHINA1688_SEARCH_URL, {
      params: {
        keywords: keyword,
        button_click: 'top',
        earseDirect: 'false',
        yuanxiao: '',
      },
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const products: Product[] = [];

    // 1688 상품 카드 선택자
    $('.sm-offer-item, .offer-item').each(async (index: number, element: any) => {
      if (index >= 5) return false; // 상위 5개만

      const $el = $(element);
      
      try {
        // 상품 정보 추출
        const titleElement = $el.find('.offer-title a, .sm-offer-title a');
        const title = titleElement.text().trim();
        const productUrl = titleElement.attr('href') || '';
        
        const priceText = $el.find('.offer-price, .sm-offer-priceNum').text().trim();
        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
        const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;
        
        const imageUrl = $el.find('.offer-img img, .sm-offer-img img').attr('src') || '';
        
        // 판매자 정보
        const sellerName = $el.find('.offer-company a, .sm-offer-company').text().trim();
        const locationText = $el.find('.offer-location, .sm-offer-location').text().trim();
        
        // 거래 수 정보 (1688은 주로 연 매출액으로 표시)
        const tradeText = $el.find('.offer-trade, .sm-offer-trade').text().trim();
        const tradeMatch = tradeText.match(/[\d,]+/);
        const transactions = tradeMatch ? parseInt(tradeMatch[0].replace(/,/g, '')) : undefined;
        
        // 최소 주문량
        const minOrderText = $el.find('.offer-moq, .sm-offer-moq').text().trim();
        const minOrderMatch = minOrderText.match(/[\d,]+/);
        const minOrder = minOrderMatch ? parseInt(minOrderMatch[0].replace(/,/g, '')) : undefined;

        if (title && price > 0) {
          const priceKRW = await convertToKRW(price, 'CNY');
          
          products.push({
            id: `1688_${index}`,
            title,
            price,
            currency: 'CNY',
            priceKRW,
            imageUrl: imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl,
            productUrl: productUrl.startsWith('//') ? `https:${productUrl}` : 
                       productUrl.startsWith('/') ? `https:${productUrl}` : productUrl,
            seller: {
              name: sellerName,
              transactions,
              trustLevel: transactions && transactions > 100000 ? 'High' : 
                         transactions && transactions > 10000 ? 'Medium' : 'Low'
            },
            site: '1688',
            minOrder,
            shipping: locationText
          });
        }
      } catch (error) {
        console.error(`1688 상품 ${index} 파싱 오류:`, error);
      }
    });

    return {
      query: keyword,
      totalResults: products.length,
      products,
      site: '1688',
      searchTime: Date.now() - startTime
    };

  } catch (error) {
    console.error('1688 검색 오류:', error);
    return {
      query: keyword,
      totalResults: 0,
      products: [],
      site: '1688',
      searchTime: Date.now() - startTime
    };
  }
}

export async function analyzeChina1688Product(url: string): Promise<any> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    // 상품 정보 추출
    const title = $('.offer-title h1, .d-title').text().trim();
    const description = $('.offer-description, .d-content').text().trim();
    
    const priceText = $('.offer-price, .price-range').text().trim();
    const priceMatch = priceText.match(/[\d,]+\.?\d*/);
    const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;
    
    const sellerName = $('.company-name, .seller-name').text().trim();
    const locationText = $('.company-location, .seller-location').text().trim();
    
    // 이미지 URL들
    const imageUrls: string[] = [];
    $('.offer-gallery img, .d-gallery img').each((_: number, el: any) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src) {
        imageUrls.push(src.startsWith('//') ? `https:${src}` : src);
      }
    });
    
    // 사양 정보
    const specifications: { [key: string]: string } = {};
    $('.offer-attr tr, .d-attr tr').each((_: number, el: any) => {
      const key = $(el).find('td:first-child, .attr-name').text().trim();
      const value = $(el).find('td:last-child, .attr-value').text().trim();
      if (key && value) {
        specifications[key] = value;
      }
    });

    const priceKRW = await convertToKRW(price, 'CNY');

    return {
      title,
      description,
      price,
      currency: 'CNY',
      priceKRW,
      specifications,
      seller: {
        name: sellerName,
      },
      site: '1688',
      imageUrls,
      originalUrl: url
    };

  } catch (error) {
    console.error('1688 상품 분석 오류:', error);
    throw new Error('1688 상품 정보를 가져올 수 없습니다.');
  }
} 