import axios from 'axios';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

interface DeepSeekMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
}

// DeepSeek API 호출 기본 함수
async function callDeepSeekAPI(messages: DeepSeekMessage[], maxTokens = 1000): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY가 설정되지 않았습니다.');
  }

  try {
    const response = await axios.post<{
      choices: Array<{
        message: {
          content: string;
        };
      }>;
    }>(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('DeepSeek API 호출 오류:', error);
    throw new Error('번역/요약 서비스에 오류가 발생했습니다.');
  }
}

// 텍스트 번역 함수
export async function translateText(text: string, targetLanguage: 'en' | 'zh'): Promise<string> {
  const languageMap = {
    en: '영어',
    zh: '중국어 간체'
  };

  const messages: DeepSeekMessage[] = [
    {
      role: 'system',
      content: `당신은 전문 번역가입니다. 주어진 한국어 텍스트를 ${languageMap[targetLanguage]}로 정확하게 번역해주세요. 상품명이나 키워드의 경우 검색에 최적화된 형태로 번역해주세요.`
    },
    {
      role: 'user',
      content: `다음 텍스트를 ${languageMap[targetLanguage]}로 번역해주세요: "${text}"`
    }
  ];

  return await callDeepSeekAPI(messages, 200);
}

// 상품 정보 요약 함수
export async function summarizeProduct(productData: {
  title: string;
  description?: string;
  specifications?: { [key: string]: string };
  price: number;
  currency: string;
  seller: string;
}): Promise<string> {
  const messages: DeepSeekMessage[] = [
    {
      role: 'system',
      content: '당신은 상품 정보를 분석하여 한국 소비자가 이해하기 쉽게 요약해주는 전문가입니다. 상품의 주요 특징, 가격 정보, 판매자 신뢰도 등을 포함하여 간결하고 유용한 요약을 제공해주세요.'
    },
    {
      role: 'user',
      content: `다음 상품 정보를 한글로 요약해주세요:
      
상품명: ${productData.title}
설명: ${productData.description || '정보 없음'}
사양: ${JSON.stringify(productData.specifications || {}, null, 2)}
가격: ${productData.price} ${productData.currency}
판매자: ${productData.seller}

한국 소비자 관점에서 이 상품의 주요 특징과 구매 시 고려사항을 3-4문장으로 요약해주세요.`
    }
  ];

  return await callDeepSeekAPI(messages, 500);
}

// 대안 상품 비교 분석 함수
export async function compareProducts(originalProduct: any, alternatives: any[]): Promise<string[]> {
  const messages: DeepSeekMessage[] = [
    {
      role: 'system',
      content: '당신은 상품 비교 전문가입니다. 원본 상품과 대안 상품들을 비교하여 각 대안의 장단점을 간결하게 설명해주세요.'
    },
    {
      role: 'user',
      content: `원본 상품과 대안 상품들을 비교해주세요:

원본 상품:
- 이름: ${originalProduct.title}
- 가격: ${originalProduct.price} ${originalProduct.currency}

대안 상품들:
${alternatives.map((alt, index) => `
${index + 1}. ${alt.title}
   가격: ${alt.price} ${alt.currency}
`).join('')}

각 대안 상품에 대해 원본 대비 차이점을 한 문장으로 설명해주세요. 가격 차이, 품질 차이, 배송 조건 등을 고려해주세요.`
    }
  ];

  const response = await callDeepSeekAPI(messages, 800);
  
  // 응답을 줄별로 나누어 각 대안에 대한 설명 추출
  const lines = response.split('\n').filter(line => line.trim());
  return lines.slice(0, alternatives.length);
}

// 검색 키워드 최적화 함수
export async function optimizeSearchKeyword(keyword: string, targetLanguage: 'en' | 'zh'): Promise<string> {
  const languageMap = {
    en: '영어',
    zh: '중국어'
  };

  const messages: DeepSeekMessage[] = [
    {
      role: 'system',
      content: `당신은 전자상거래 검색 최적화 전문가입니다. 한국어 상품 키워드를 ${languageMap[targetLanguage]} 검색에 최적화된 형태로 변환해주세요.`
    },
    {
      role: 'user',
      content: `"${keyword}"를 ${languageMap[targetLanguage]} 온라인 쇼핑몰에서 검색하기에 가장 적합한 키워드로 변환해주세요. 검색 결과가 많이 나올 수 있도록 일반적이고 정확한 용어를 사용해주세요.`
    }
  ];

  return await callDeepSeekAPI(messages, 100);
} 