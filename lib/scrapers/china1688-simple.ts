import { Product, SearchResult } from '../types';
import { convertToKRW } from '../exchange';

export async function search1688Simple(keyword: string): Promise<SearchResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 1688 테스트 검색 시작:', keyword);
    
    // 테스트용 더미 데이터 생성
    const products: Product[] = [];
    
    for (let i = 0; i < 6; i++) {
      const basePrice = 5.20 + (i * 2.3);
      const product: Product = {
        id: `1688_test_${Date.now()}_${i}`,
        title: `${keyword} 工厂直销 ${i + 1} - 批发价格`,
        price: basePrice,
        currency: 'CNY',
        priceKRW: await convertToKRW(basePrice, 'CNY'),
        imageUrl: 'https://via.placeholder.com/200x200?text=1688+Product',
        productUrl: `https://detail.1688.com/offer/test-${keyword.replace(/\s+/g, '-')}-${i + 1}.html`,
        seller: {
          name: `1688 工厂 ${i + 1}`,
          rating: 3.8 + (Math.random() * 1.2),
          trustLevel: 'Medium'
        },
        site: '1688',
        minOrder: 500 + (i * 100),
        shipping: 'China Domestic'
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
    console.error('❌ 1688 테스트 오류:', error);
    
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