import axios from 'axios';
import { ExchangeRate } from './types';

const EXCHANGE_API_URL = 'https://api.exchangerate.host/latest';

// 환율 정보 캐시 (1시간 유효)
let exchangeRateCache: {
  data: ExchangeRate | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION = 60 * 60 * 1000; // 1시간

// 환율 정보 가져오기
export async function getExchangeRates(): Promise<ExchangeRate> {
  const now = Date.now();
  
  // 캐시된 데이터가 있고 유효한 경우 반환
  if (exchangeRateCache.data && (now - exchangeRateCache.timestamp) < CACHE_DURATION) {
    return exchangeRateCache.data;
  }

  try {
    // USD to KRW
    const usdResponse = await axios.get(`${EXCHANGE_API_URL}?base=USD&symbols=KRW`);
    const usdToKrw = usdResponse.data.rates.KRW;

    // CNY to KRW
    const cnyResponse = await axios.get(`${EXCHANGE_API_URL}?base=CNY&symbols=KRW`);
    const cnyToKrw = cnyResponse.data.rates.KRW;

    const exchangeRate: ExchangeRate = {
      USD_KRW: usdToKrw,
      CNY_KRW: cnyToKrw,
      lastUpdated: new Date().toISOString()
    };

    // 캐시 업데이트
    exchangeRateCache = {
      data: exchangeRate,
      timestamp: now
    };

    return exchangeRate;
  } catch (error) {
    console.error('환율 정보 가져오기 실패:', error);
    
    // 캐시된 데이터가 있으면 반환 (만료되었어도)
    if (exchangeRateCache.data) {
      return exchangeRateCache.data;
    }
    
    // 기본값 반환 (대략적인 환율)
    return {
      USD_KRW: 1300,
      CNY_KRW: 180,
      lastUpdated: new Date().toISOString()
    };
  }
}

// 가격을 한화로 변환
export async function convertToKRW(price: number, currency: string): Promise<number> {
  const rates = await getExchangeRates();
  
  switch (currency.toUpperCase()) {
    case 'USD':
      return Math.round(price * rates.USD_KRW);
    case 'CNY':
    case 'RMB':
      return Math.round(price * rates.CNY_KRW);
    case 'KRW':
      return Math.round(price);
    default:
      // 알 수 없는 통화는 USD로 가정
      return Math.round(price * rates.USD_KRW);
  }
}

// 환율 정보 포맷팅
export function formatExchangeRate(rates: ExchangeRate): string {
  return `1 USD = ${rates.USD_KRW.toLocaleString()}원, 1 CNY = ${rates.CNY_KRW.toLocaleString()}원 (${new Date(rates.lastUpdated).toLocaleString('ko-KR')} 기준)`;
} 