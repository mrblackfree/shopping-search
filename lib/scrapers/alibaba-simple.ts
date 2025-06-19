import { Product, SearchResult } from '../types';
import { convertToKRW } from '../exchange';

export async function searchAlibabaSimple(keyword: string): Promise<SearchResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Alibaba 테스트 검색 시작:', keyword);
    
    // 테스트용 더미 데이터 생성
    const products: Product[] = [];
    
    for (let i = 0; i < 4; i++) {
      const basePrice = 8.50 + (i * 3.5);
      const product: Product = {
        id: `alibaba_test_${Date.now()}_${i}`,
        title: `${keyword} Professional ${i + 1} - High Quality Wholesale`,
        price: basePrice,
        currency: 'USD',
        priceKRW: await convertToKRW(basePrice, 'USD'),
        imageUrl: 'https://via.placeholder.com/200x200?text=Alibaba+Product',
        productUrl: `https://www.alibaba.com/product-detail/test-${keyword.replace(/\s+/g, '-')}-${i + 1}.html`,
        seller: {
          name: `Alibaba Supplier ${i + 1}`,
          rating: 4.2 + (Math.random() * 0.8),
          trustLevel: 'High'
        },
        site: 'alibaba',
        minOrder: 100 + (i * 50),
        shipping: 'Express Shipping'
      };
      
      products.push(product);
    }
    
    console.log(`✅ Alibaba 테스트 완료: ${products.length}개 상품 생성`);
    
    return {
      query: keyword,
      totalResults: products.length,
      products: products,
      site: 'alibaba',
      searchTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('❌ Alibaba 테스트 오류:', error);
    
    return {
      query: keyword,
      totalResults: 0,
      products: [],
      site: 'alibaba',
      searchTime: Date.now() - startTime
    };
  }
} 