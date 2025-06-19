import dotenv from 'dotenv';
dotenv.config();

import { NextApiRequest, NextApiResponse } from 'next';
import { searchAlibabaSimple } from '../../lib/scrapers/alibaba-simple';
import { searchDHgateSimple } from '../../lib/scrapers/dhgate-simple';
import { searchChina1688Simple } from '../../lib/scrapers/china1688-simple';
import { crawlWithVPN } from '../../lib/scrapers/vpn-crawler';
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
    const { keyword, useVPN = false } = req.body;

    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({
        success: false,
        error: '검색 키워드를 입력해주세요.'
      });
    }

    console.log(`🔍 검색 시작: ${keyword} (VPN: ${useVPN ? '활성화' : '비활성화'})`);

    // VPN 크롤링 사용 여부 확인
    if (useVPN) {
      console.log('🌐 VPN 크롤링 모드 활성화');
      
      // VPN 크롤링 실행
      const vpnResults = await crawlWithVPN(keyword);
      
      // VPN 결과를 기존 형식으로 변환
      const data = {
        alibaba: vpnResults.find(r => r.site === 'alibaba') || {
          query: keyword,
          totalResults: 0,
          products: [],
          site: 'alibaba' as const,
          searchTime: 0
        },
        dhgate: vpnResults.find(r => r.site === 'dhgate') || {
          query: keyword,
          totalResults: 0,
          products: [],
          site: 'dhgate' as const,
          searchTime: 0
        },
        '1688': vpnResults.find(r => r.site === '1688') || {
          query: keyword,
          totalResults: 0,
          products: [],
          site: '1688' as const,
          searchTime: 0
        }
      };

      return res.status(200).json({
        success: true,
        data,
        vpnMode: true
      });
    }

    // 기존 크롤링 방식 (VPN 미사용)
    console.log('🔧 일반 크롤링 모드');
    
    // 키워드 번역 (임시 비활성화)
    // const [englishKeyword, chineseKeyword] = await Promise.all([
    //   optimizeSearchKeyword(keyword, 'en'),
    //   optimizeSearchKeyword(keyword, 'zh')
    // ]);
    
    // 임시로 직접 번역된 키워드 사용
    const englishKeyword = keyword === '무선 이어폰' ? 'wireless earphones' : 
                          keyword === '노트북' ? 'laptop' :
                          keyword === '스마트폰 케이스' ? 'phone case' :
                          keyword === 'LED 조명' ? 'LED light' :
                          keyword; // 기본값은 원본 키워드
                          
    const chineseKeyword = keyword === '무선 이어폰' ? '无线耳机' :
                          keyword === '노트북' ? '笔记本电脑' :
                          keyword === '스마트폰 케이스' ? '手机壳' :
                          keyword === 'LED 조명' ? 'LED灯' :
                          keyword; // 기본값은 원본 키워드

    console.log(`검색 키워드: ${keyword}`);
    console.log(`영어 번역: ${englishKeyword}`);
    console.log(`중국어 번역: ${chineseKeyword}`);

    // 3개 사이트에서 동시 검색
    const [alibabaResult, dhgateResult, china1688Result] = await Promise.allSettled([
      searchAlibabaSimple(englishKeyword),
      searchDHgateSimple(englishKeyword),
      searchChina1688Simple(chineseKeyword)
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