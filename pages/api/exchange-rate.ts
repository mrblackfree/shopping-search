import { NextApiRequest, NextApiResponse } from 'next';
import { getExchangeRates, formatExchangeRate } from '../../lib/exchange';
import { ApiResponse, ExchangeRate } from '../../lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ExchangeRate & { formatted: string }>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const exchangeRate = await getExchangeRates();
    const formatted = formatExchangeRate(exchangeRate);

    res.status(200).json({
      success: true,
      data: {
        ...exchangeRate,
        formatted
      }
    });

  } catch (error) {
    console.error('환율 API 오류:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '환율 정보를 가져올 수 없습니다.'
    });
  }
} 