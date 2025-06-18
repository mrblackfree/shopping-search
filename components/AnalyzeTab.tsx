import React, { useState } from 'react';
import { LinkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import ProductSummary from './ProductSummary';
import { AnalyzeResponse } from '../lib/types';

const AnalyzeTab: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      alert('URL을 입력해주세요.');
      return;
    }

    // URL 형식 간단 검증
    if (!url.includes('alibaba.com') && !url.includes('1688.com') && !url.includes('dhgate.com')) {
      alert('Alibaba, 1688, DHgate URL만 지원합니다.');
      return;
    }

    setLoading(true);
    setAnalyzeResult(null);

    try {
      const response = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data: AnalyzeResponse = await response.json();
      
      if (data.success && data.data) {
        setAnalyzeResult(data);
      } else {
        alert(data.error || 'URL 분석 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('URL 분석 오류:', error);
      alert('URL 분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const exampleUrls = [
    'https://www.alibaba.com/product-detail/...',
    'https://www.dhgate.com/product/...',
    'https://detail.1688.com/offer/...'
  ];

  return (
    <div className="space-y-6">
      {/* URL 입력 폼 */}
      <div className="card p-6">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium mb-2">
              상품 URL 붙여넣기
            </label>
            <div className="relative">
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.alibaba.com/product-detail/..."
                className="input-field pr-12"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-primary-600 hover:text-primary-700 disabled:text-gray-400"
              >
                {loading ? (
                  <div className="loading-spinner" />
                ) : (
                  <SparklesIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-2">지원 사이트:</p>
            <ul className="space-y-1">
              {exampleUrls.map((example, index) => (
                <li key={index} className="flex items-center">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {example}
                  </code>
                </li>
              ))}
            </ul>
          </div>
          
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="btn-primary w-full sm:w-auto"
          >
            {loading ? '분석 중...' : '📎 URL 분석하기'}
          </button>
        </form>
      </div>

      {/* 분석 결과 */}
      {analyzeResult && analyzeResult.data && (
        <ProductSummary 
          product={analyzeResult.data.product}
          alternatives={analyzeResult.data.alternatives}
        />
      )}

      {/* 분석 전 안내 */}
      {!analyzeResult && !loading && (
        <div className="card p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            <SparklesIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">상품 URL 분석을 시작해보세요</h3>
            <p className="text-sm mb-4">
              상품 페이지 URL을 붙여넣으면 AI가 상품을 분석하고 더 저렴한 대안을 찾아드립니다.
            </p>
            <div className="text-xs space-y-1">
              <p>• 상품 정보를 한글로 요약</p>
              <p>• 다른 사이트에서 더 저렴한 대안 검색</p>
              <p>• 절약 금액과 비율 계산</p>
              <p>• 상품 사양 및 판매자 정보 분석</p>
            </div>
          </div>
        </div>
      )}

      {/* 사용 팁 */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          💡 URL 분석 사용 팁
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">분석 가능한 정보</h4>
            <ul className="space-y-1">
              <li>• 상품명 및 사양</li>
              <li>• 가격 정보 (한화 환산)</li>
              <li>• 판매자 신뢰도</li>
              <li>• 최소 주문량</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">대안 추천 기준</h4>
            <ul className="space-y-1">
              <li>• 더 저렴한 가격</li>
              <li>• 유사한 상품 사양</li>
              <li>• 신뢰할 수 있는 판매자</li>
              <li>• 합리적인 배송 조건</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyzeTab; 