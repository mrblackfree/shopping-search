// 상품 정보 타입
export interface Product {
  id: string;
  title: string;
  price: number;
  currency: string;
  priceKRW: number;
  imageUrl: string;
  productUrl: string;
  seller: {
    name: string;
    rating?: number;
    transactions?: number;
    trustLevel?: string;
  };
  site: 'alibaba' | '1688' | 'dhgate' | 'aliexpress';
  minOrder?: number;
  shipping?: string;
}

// 검색 결과 타입
export interface SearchResult {
  query: string;
  totalResults: number;
  products: Product[];
  site: 'alibaba' | '1688' | 'dhgate' | 'aliexpress';
  searchTime: number;
}

// 전체 검색 응답 타입
export interface SearchResponse {
  success: boolean;
  data?: {
    alibaba: SearchResult;
    dhgate: SearchResult;
    '1688': SearchResult;
  };
  error?: string;
  vpnMode?: boolean; // VPN 크롤링 모드 여부
}

// URL 분석 결과 타입
export interface AnalyzedProduct {
  title: string;
  description: string;
  price: number;
  currency: string;
  priceKRW: number;
  specifications: { [key: string]: string };
  seller: {
    name: string;
    rating?: number;
    transactions?: number;
  };
  site: 'alibaba' | '1688' | 'dhgate' | 'aliexpress';
  imageUrls: string[];
  originalUrl: string;
  summary: string; // AI 생성 한글 요약
}

// 대안 상품 추천 타입
export interface AlternativeProduct extends Product {
  comparisonNote: string; // 원본 대비 차이점
  savings: number; // 절약 금액 (KRW)
  savingsPercent: number; // 절약 비율
}

// URL 분석 응답 타입
export interface AnalyzeResponse {
  success: boolean;
  data?: {
    product: AnalyzedProduct;
    alternatives: AlternativeProduct[];
  };
  error?: string;
}

// 번역 요청/응답 타입
export interface TranslateRequest {
  text: string;
  targetLanguage: 'en' | 'zh';
}

export interface TranslateResponse {
  success: boolean;
  translatedText?: string;
  error?: string;
}

// 환율 정보 타입
export interface ExchangeRate {
  USD_KRW: number;
  CNY_KRW: number;
  lastUpdated: string;
}

// API 응답 기본 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
} 