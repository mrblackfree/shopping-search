import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product, SearchResult } from '../types';
import { convertToKRW } from '../exchange';

const DHGATE_SEARCH_URL = 'https://www.dhgate.com/wholesale/search.do';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

export async function searchDHgate(keyword: string): Promise<SearchResult> {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(DHGATE_SEARCH_URL, {
      params: {
        searchkey: keyword,
        catalog: '',
        searchSource: 'search',
        stype: '1'
      },
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const products: Product[] = [];

    // DHgate 상품 카드 선택자
    $('.product-item, .search-item').each(async (index, element) => {
      if (index >= 5) return false; // 상위 5개만

      const $el = $(element);
      
      try {
        // 상품 정보 추출
        const titleElement = $el.find('.product-title a, .item-title a');
        const title = titleElement.text().trim();
        const productUrl = titleElement.attr('href') || '';
        
        const priceText = $el.find('.price-now, .item-price').text().trim();
        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
        const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;
        
        const imageUrl = $el.find('.product-image img, .item-img img').attr('src') || '';
        
        // 판매자 정보
        const sellerName = $el.find('.seller-name, .store-name').text().trim();
        const ratingText = $el.find('.seller-rating, .store-rating').text().trim();
        const ratingMatch = ratingText.match(/[\d.]+/);
        const rating = ratingMatch ? parseFloat(ratingMatch[0]) : undefined;
        
        // 거래 수 정보
        const ordersText = $el.find('.orders-count, .sold-count').text().trim();
        const ordersMatch = ordersText.match(/[\d,]+/);
        const transactions = ordersMatch ? parseInt(ordersMatch[0].replace(/,/g, '')) : undefined;
        
        // 최소 주문량
        const minOrderText = $el.find('.min-order, .moq').text().trim();
        const minOrderMatch = minOrderText.match(/[\d,]+/);
        const minOrder = minOrderMatch ? parseInt(minOrderMatch[0].replace(/,/g, '')) : 1;
        
        // 배송 정보
        const shippingText = $el.find('.shipping-info, .delivery-info').text().trim();

        if (title && price > 0) {
          const priceKRW = await convertToKRW(price, 'USD');
          
          products.push({
            id: `dhgate_${index}`,
            title,
            price,
            currency: 'USD',
            priceKRW,
            imageUrl: imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl,
            productUrl: productUrl.startsWith('//') ? `https:${productUrl}` : 
                       productUrl.startsWith('/') ? `https://www.dhgate.com${productUrl}` : productUrl,
            seller: {
              name: sellerName,
              rating,
              transactions,
              trustLevel: rating && rating > 4.5 ? 'High' : rating && rating > 3.5 ? 'Medium' : 'Low'
            },
            site: 'dhgate',
            minOrder,
            shipping: shippingText || 'Free Shipping'
          });
        }
      } catch (error) {
        console.error(`DHgate 상품 ${index} 파싱 오류:`, error);
      }
    });

    return {
      query: keyword,
      totalResults: products.length,
      products,
      site: 'dhgate',
      searchTime: Date.now() - startTime
    };

  } catch (error) {
    console.error('DHgate 검색 오류:', error);
    return {
      query: keyword,
      totalResults: 0,
      products: [],
      site: 'dhgate',
      searchTime: Date.now() - startTime
    };
  }
}

export async function analyzeDHgateProduct(url: string): Promise<any> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    // 상품 정보 추출
    const title = $('.product-name h1, .item-title').text().trim();
    const description = $('.product-description, .item-description').text().trim();
    
    const priceText = $('.price-now, .current-price').text().trim();
    const priceMatch = priceText.match(/[\d,]+\.?\d*/);
    const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;
    
    const sellerName = $('.seller-info .name, .store-name').text().trim();
    const ratingText = $('.seller-rating, .store-rating').text().trim();
    const ratingMatch = ratingText.match(/[\d.]+/);
    const rating = ratingMatch ? parseFloat(ratingMatch[0]) : undefined;
    
    const transactionText = $('.transaction-count, .orders-count').text().trim();
    const transactionMatch = transactionText.match(/[\d,]+/);
    const transactions = transactionMatch ? parseInt(transactionMatch[0].replace(/,/g, '')) : undefined;
    
    // 이미지 URL들
    const imageUrls: string[] = [];
    $('.product-gallery img, .item-images img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src) {
        imageUrls.push(src.startsWith('//') ? `https:${src}` : src);
      }
    });
    
    // 사양 정보
    const specifications: { [key: string]: string } = {};
    $('.product-specs tr, .item-specs tr').each((_, el) => {
      const key = $(el).find('td:first-child, .spec-name').text().trim();
      const value = $(el).find('td:last-child, .spec-value').text().trim();
      if (key && value) {
        specifications[key] = value;
      }
    });

    const priceKRW = await convertToKRW(price, 'USD');

    return {
      title,
      description,
      price,
      currency: 'USD',
      priceKRW,
      specifications,
      seller: {
        name: sellerName,
        rating,
        transactions,
      },
      site: 'dhgate',
      imageUrls,
      originalUrl: url
    };

  } catch (error) {
    console.error('DHgate 상품 분석 오류:', error);
    throw new Error('DHgate 상품 정보를 가져올 수 없습니다.');
  }
} 