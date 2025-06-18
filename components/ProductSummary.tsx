import React from 'react';
import { 
  ArrowTopRightOnSquareIcon, 
  DocumentDuplicateIcon,
  TagIcon,
  TruckIcon,
  CurrencyDollarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { AnalyzedProduct, AlternativeProduct } from '../lib/types';

interface ProductSummaryProps {
  product: AnalyzedProduct;
  alternatives: AlternativeProduct[];
}

const ProductSummary: React.FC<ProductSummaryProps> = ({ product, alternatives }) => {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('링크가 복사되었습니다!');
    } catch (error) {
      console.error('복사 실패:', error);
      alert('복사에 실패했습니다.');
    }
  };

  const getSiteBadgeClass = (site: string) => {
    switch (site) {
      case 'alibaba': return 'site-alibaba';
      case 'dhgate': return 'site-dhgate';
      case '1688': return 'site-1688';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* 상품 요약 카드 */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            📋 상품 분석 결과
          </h2>
          <span className={`site-badge ${getSiteBadgeClass(product.site)}`}>
            {product.site === '1688' ? '1688' : 
             product.site.charAt(0).toUpperCase() + product.site.slice(1)}
          </span>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* 좌측: 상품 정보 */}
          <div className="space-y-4">
            {/* 상품 이미지 */}
            {product.imageUrls && product.imageUrls.length > 0 && (
              <div className="flex space-x-2 overflow-x-auto">
                {product.imageUrls.slice(0, 3).map((imageUrl, index) => (
                  <img
                    key={index}
                    src={imageUrl}
                    alt={`${product.title} ${index + 1}`}
                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ))}
              </div>
            )}

            {/* 상품명 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {product.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {product.description}
              </p>
            </div>

            {/* 가격 정보 */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <CurrencyDollarIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                <span className="font-medium text-gray-900 dark:text-white">가격 정보</span>
              </div>
              <div className="space-y-1">
                <div className="price-krw text-lg">
                  ₩{product.priceKRW.toLocaleString()}
                </div>
                <div className="price-original">
                  {product.price.toFixed(2)} {product.currency}
                </div>
              </div>
            </div>

            {/* 판매자 정보 */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <TagIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
                <span className="font-medium text-gray-900 dark:text-white">판매자 정보</span>
              </div>
              <div className="space-y-1 text-sm">
                <div>판매자: {product.seller.name}</div>
                {product.seller.rating && (
                  <div>평점: ⭐ {product.seller.rating}</div>
                )}
                {product.seller.transactions && (
                  <div>거래수: {product.seller.transactions.toLocaleString()}</div>
                )}
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex space-x-3">
              <button
                onClick={() => copyToClipboard(product.originalUrl)}
                className="btn-secondary flex items-center"
              >
                <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                링크 복사
              </button>
              <a
                href={product.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex items-center"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
                원본 보기
              </a>
            </div>
          </div>

          {/* 우측: AI 요약 */}
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center mb-3">
                <SparklesIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                <span className="font-medium text-gray-900 dark:text-white">AI 요약</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {product.summary}
              </p>
            </div>

            {/* 사양 정보 */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">상품 사양</h4>
                <div className="space-y-2">
                  {Object.entries(product.specifications).slice(0, 5).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{key}:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 대안 상품 추천 */}
      {alternatives.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <TruckIcon className="h-6 w-6 text-primary-600 dark:text-primary-400 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              💰 더 저렴한 대안 상품
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alternatives.map((alternative, index) => (
              <div key={alternative.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                {/* 절약 정보 배지 */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`site-badge ${getSiteBadgeClass(alternative.site)}`}>
                    {alternative.site === '1688' ? '1688' : 
                     alternative.site.charAt(0).toUpperCase() + alternative.site.slice(1)}
                  </span>
                  <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 px-2 py-1 rounded text-xs font-medium">
                    -{alternative.savingsPercent}% 절약
                  </div>
                </div>

                {/* 상품 정보 */}
                <div className="space-y-2">
                  {alternative.imageUrl && (
                    <img
                      src={alternative.imageUrl}
                      alt={alternative.title}
                      className="w-full h-32 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                    {alternative.title}
                  </h3>
                  
                  <div className="space-y-1">
                    <div className="price-krw">
                      ₩{alternative.priceKRW.toLocaleString()}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      ₩{alternative.savings.toLocaleString()} 절약
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {alternative.comparisonNote}
                  </p>

                  {/* 액션 버튼 */}
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => copyToClipboard(alternative.productUrl)}
                      className="flex-1 text-xs btn-secondary py-1"
                    >
                      복사
                    </button>
                    <a
                      href={alternative.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-xs btn-primary py-1 text-center"
                    >
                      보기
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 대안이 없을 때 */}
      {alternatives.length === 0 && (
        <div className="card p-6 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            <TruckIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">더 저렴한 대안을 찾지 못했습니다</h3>
            <p className="text-sm">
              현재 상품이 이미 최저가이거나, 유사한 상품을 다른 사이트에서 찾을 수 없습니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSummary; 