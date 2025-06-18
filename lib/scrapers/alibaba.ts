import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product, SearchResult } from '../types';
import { convertToKRW } from '../exchange';

const ALIBABA_SEARCH_URL = 'https://www.alibaba.com/trade/search';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

export async function searchAlibaba(keyword: string): Promise<SearchResult> {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(ALIBABA_SEARCH_URL, {
      params: {
        fsb: 'y',
        IndexArea: 'product_en',
        CatId: '',
        SearchText: keyword,
        viewtype: 'G'
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

    // Alibaba 상품 카드 선택자 (실제 구조에 맞게 조정 필요)
    $('.gallery-offer-item, .organic-offer-wrapper').each(async (index, element) => {
      if (index >= 5) return false; // 상위 5개만

      const $el = $(element);
      
      try {
        // 상품 정보 추출
        const titleElement = $el.find('.offer-title a, .title-link');
        const title = titleElement.text().trim();
        const productUrl = titleElement.attr('href') || '';
        
        const priceText = $el.find('.price-current, .price').text().trim();
        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
        const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;
        
        const imageUrl = $el.find('.offer-img img, .product-img img').attr('src') || '';
        
        // 판매자 정보
        const sellerName = $el.find('.supplier-name a, .company-name').text().trim();
        const ratingText = $el.find('.rating-star, .supplier-rating').text().trim();
        const ratingMatch = ratingText.match(/[\d.]+/);
        const rating = ratingMatch ? parseFloat(ratingMatch[0]) : undefined;
        
        // 거래 수 정보
        const transactionText = $el.find('.transaction-level, .trade-amount').text().trim();
        const transactionMatch = transactionText.match(/[\d,]+/);
        const transactions = transactionMatch ? parseInt(transactionMatch[0].replace(/,/g, '')) : undefined;
        
        // 최소 주문량
        const minOrderText = $el.find('.moq, .min-order').text().trim();
        const minOrderMatch = minOrderText.match(/[\d,]+/);
        const minOrder = minOrderMatch ? parseInt(minOrderMatch[0].replace(/,/g, '')) : undefined;

        if (title && price > 0) {
          const priceKRW = await convertToKRW(price, 'USD');
          
          products.push({
            id: `alibaba_${index}`,
            title,
            price,
            currency: 'USD',
            priceKRW,
            imageUrl: imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl,
            productUrl: productUrl.startsWith('//') ? `https:${productUrl}` : 
                       productUrl.startsWith('/') ? `https://www.alibaba.com${productUrl}` : productUrl,
            seller: {
              name: sellerName,
              rating,
              transactions,
              trustLevel: rating && rating > 4.0 ? 'High' : rating && rating > 3.0 ? 'Medium' : 'Low'
            },
            site: 'alibaba',
            minOrder,
            shipping: 'Contact Supplier'
          });
        }
      } catch (error) {
        console.error(`Alibaba 상품 ${index} 파싱 오류:`, error);
      }
    });

    return {
      query: keyword,
      totalResults: products.length,
      products,
      site: 'alibaba',
      searchTime: Date.now() - startTime
    };

  } catch (error) {
    console.error('Alibaba 검색 오류:', error);
    return {
      query: keyword,
      totalResults: 0,
      products: [],
      site: 'alibaba',
      searchTime: Date.now() - startTime
    };
  }
}

export async function analyzeAlibabaProduct(url: string): Promise<any> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    // 상품 정보 추출
    const title = $('.product-title h1, .product-name').text().trim();
    const description = $('.product-description, .product-detail').text().trim();
    
    const priceText = $('.price-current, .price-range').text().trim();
    const priceMatch = priceText.match(/[\d,]+\.?\d*/);
    const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;
    
    const sellerName = $('.supplier-name, .company-name').text().trim();
    const ratingText = $('.rating-star').text().trim();
    const ratingMatch = ratingText.match(/[\d.]+/);
    const rating = ratingMatch ? parseFloat(ratingMatch[0]) : undefined;
    
    // 이미지 URL들
    const imageUrls: string[] = [];
    $('.product-img img, .image-gallery img').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        imageUrls.push(src.startsWith('//') ? `https:${src}` : src);
      }
    });
    
    // 사양 정보
    const specifications: { [key: string]: string } = {};
    $('.product-spec tr, .specification-item').each((_, el) => {
      const key = $(el).find('td:first-child, .spec-key').text().trim();
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
      },
      site: 'alibaba',
      imageUrls,
      originalUrl: url
    };

  } catch (error) {
    console.error('Alibaba 상품 분석 오류:', error);
    throw new Error('Alibaba 상품 정보를 가져올 수 없습니다.');
  }
} 