import { NextApiRequest, NextApiResponse } from 'next';
import { analyzeAlibabaProduct } from '../../lib/scrapers/alibaba';
import { analyzeDHgateProduct } from '../../lib/scrapers/dhgate';
import { analyzeChina1688Product } from '../../lib/scrapers/china1688';
import { searchAlibaba } from '../../lib/scrapers/alibaba';
import { searchDHgate } from '../../lib/scrapers/dhgate';
import { searchChina1688 } from '../../lib/scrapers/china1688';
import { summarizeProduct, compareProducts, optimizeSearchKeyword } from '../../lib/deepseek';
import { AnalyzeResponse, AlternativeProduct } from '../../lib/types';

function detectSite(url: string): 'alibaba' | '1688' | 'dhgate' | null {
  if (url.includes('alibaba.com')) return 'alibaba';
  if (url.includes('1688.com')) return '1688';
  if (url.includes('dhgate.com')) return 'dhgate';
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalyzeResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'URL을 입력해주세요.'
      });
    }

    const site = detectSite(url);
    if (!site) {
      return res.status(400).json({
        success: false,
        error: '지원하지 않는 사이트입니다. (Alibaba, 1688, DHgate만 지원)'
      });
    }

    // 상품 정보 분석
    let productData;
    try {
      switch (site) {
        case 'alibaba':
          productData = await analyzeAlibabaProduct(url);
          break;
        case '1688':
          productData = await analyzeChina1688Product(url);
          break;
        case 'dhgate':
          productData = await analyzeDHgateProduct(url);
          break;
        default:
          throw new Error('지원하지 않는 사이트입니다.');
      }
    } catch (error) {
      console.error('상품 분석 오류:', error);
      return res.status(500).json({
        success: false,
        error: '상품 정보를 분석할 수 없습니다.'
      });
    }

    // AI 요약 생성
    const summary = await summarizeProduct({
      title: productData.title,
      description: productData.description,
      specifications: productData.specifications,
      price: productData.price,
      currency: productData.currency,
      seller: productData.seller.name
    });

    const analyzedProduct = {
      ...productData,
      summary
    };

    // 대안 상품 검색
    const alternatives: AlternativeProduct[] = [];
    
    try {
      // 상품명에서 키워드 추출 (간단한 방법)
      const searchKeyword = productData.title.split(' ').slice(0, 3).join(' ');
      
      // 다른 사이트들에서 검색
      const searchPromises = [];
      
      if (site !== 'alibaba') {
        const englishKeyword = await optimizeSearchKeyword(searchKeyword, 'en');
        searchPromises.push(searchAlibaba(englishKeyword));
      }
      
      if (site !== 'dhgate') {
        const englishKeyword = await optimizeSearchKeyword(searchKeyword, 'en');
        searchPromises.push(searchDHgate(englishKeyword));
      }
      
      if (site !== '1688') {
        const chineseKeyword = await optimizeSearchKeyword(searchKeyword, 'zh');
        searchPromises.push(searchChina1688(chineseKeyword));
      }

      const searchResults = await Promise.all(searchPromises.map(p => 
        p.catch(error => {
          console.error('대안 검색 오류:', error);
          return { products: [] };
        })
      ));

      // 더 저렴한 대안만 필터링
      const allAlternatives = searchResults.flatMap(result => result.products || []);
      const cheaperAlternatives = allAlternatives.filter(alt => 
        alt.priceKRW < productData.priceKRW
      );

      // 상위 3개만 선택 (가격 순)
      const topAlternatives = cheaperAlternatives
        .sort((a, b) => a.priceKRW - b.priceKRW)
        .slice(0, 3);

      // 비교 분석 추가
      if (topAlternatives.length > 0) {
        const comparisons = await compareProducts(productData, topAlternatives);
        
        topAlternatives.forEach((alt, index) => {
          const savings = productData.priceKRW - alt.priceKRW;
          const savingsPercent = Math.round((savings / productData.priceKRW) * 100);
          
          alternatives.push({
            ...alt,
            comparisonNote: comparisons[index] || '더 저렴한 대안 상품입니다.',
            savings,
            savingsPercent
          });
        });
      }

    } catch (error) {
      console.error('대안 검색 오류:', error);
      // 대안 검색 실패해도 원본 분석은 반환
    }

    res.status(200).json({
      success: true,
      data: {
        product: analyzedProduct,
        alternatives
      }
    });

  } catch (error) {
    console.error('URL 분석 API 오류:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'URL 분석 중 오류가 발생했습니다.'
    });
  }
} 