import { NextApiRequest, NextApiResponse } from 'next';
import { translateText, optimizeSearchKeyword } from '../../lib/deepseek';
import { TranslateRequest, TranslateResponse } from '../../lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TranslateResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { text, targetLanguage }: TranslateRequest = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: '텍스트와 대상 언어를 입력해주세요.'
      });
    }

    if (!['en', 'zh'].includes(targetLanguage)) {
      return res.status(400).json({
        success: false,
        error: '지원하지 않는 언어입니다. (en, zh만 지원)'
      });
    }

    // 검색 키워드 최적화를 통한 번역
    const translatedText = await optimizeSearchKeyword(text, targetLanguage);

    res.status(200).json({
      success: true,
      translatedText
    });

  } catch (error) {
    console.error('번역 API 오류:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '번역 중 오류가 발생했습니다.'
    });
  }
} 