import { NextApiRequest, NextApiResponse } from 'next';
import { searchAlibaba } from '../../lib/scrapers/alibaba';
import { searchDHgate } from '../../lib/scrapers/dhgate';
import { search1688 } from '../../lib/scrapers/china1688';
import { optimizeSearchKeyword } from '../../lib/deepseek';
import { SearchResponse } from '../../lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { keyword } = req.body;

    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({
        success: false,
        error: '검색 키워드를 입력해주세요.'
      });
    }

    // 키워드 번역
    const [englishKeyword, chineseKeyword] = await Promise.all([
      optimizeSearchKeyword(keyword, 'en'),
      optimizeSearchKeyword(keyword, 'zh')
    ]);

    console.log(`검색 키워드: ${keyword}`);
    console.log(`영어 번역: ${englishKeyword}`);
    console.log(`중국어 번역: ${chineseKeyword}`);

    // 3개 사이트에서 동시 검색
    const [alibabaResult, dhgateResult, china1688Result] = await Promise.allSettled([
      searchAlibaba(englishKeyword),
      searchDHgate(englishKeyword),
      search1688(chineseKeyword)
    ]);

    // 결과 처리
    const data = {
      alibaba: alibabaResult.status === 'fulfilled' ? alibabaResult.value : {
        query: englishKeyword,
        totalResults: 0,
        products: [],
        site: 'alibaba' as const,
        searchTime: 0
      },
      dhgate: dhgateResult.status === 'fulfilled' ? dhgateResult.value : {
        query: englishKeyword,
        totalResults: 0,
        products: [],
        site: 'dhgate' as const,
        searchTime: 0
      },
      '1688': china1688Result.status === 'fulfilled' ? china1688Result.value : {
        query: chineseKeyword,
        totalResults: 0,
        products: [],
        site: '1688' as const,
        searchTime: 0
      }
    };

    // 에러 로깅
    [alibabaResult, dhgateResult, china1688Result].forEach((result, index) => {
      if (result.status === 'rejected') {
        const sites = ['Alibaba', 'DHgate', '1688'];
        console.error(`${sites[index]} 검색 실패:`, result.reason);
      }
    });

    res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.error('검색 API 오류:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.'
    });
  }
} 