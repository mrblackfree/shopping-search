import React, { useState } from 'react';
import { 
  ArrowsUpDownIcon, 
  ArrowTopRightOnSquareIcon, 
  DocumentDuplicateIcon,
  StarIcon 
} from '@heroicons/react/24/outline';
import { Product } from '../lib/types';

interface ProductTableProps {
  products: Product[];
  site: 'alibaba' | 'dhgate' | '1688';
  loading: boolean;
}

type SortField = 'price' | 'priceKRW' | 'title' | 'seller';
type SortDirection = 'asc' | 'desc';

const ProductTable: React.FC<ProductTableProps> = ({ products, site, loading }) => {
  const [sortField, setSortField] = useState<SortField>('priceKRW');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'seller') {
      aValue = a.seller.name;
      bValue = b.seller.name;
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('링크가 복사되었습니다!');
    } catch (error) {
      console.error('복사 실패:', error);
      alert('복사에 실패했습니다.');
    }
  };

  const getTrustLevelColor = (trustLevel?: string) => {
    switch (trustLevel) {
      case 'High': return 'trust-high';
      case 'Medium': return 'trust-medium';
      case 'Low': return 'trust-low';
      default: return 'text-gray-500';
    }
  };

  const formatCurrency = (price: number, currency: string) => {
    switch (currency) {
      case 'USD': return `$${price.toFixed(2)}`;
      case 'CNY': return `¥${price.toFixed(2)}`;
      case 'KRW': return `₩${price.toLocaleString()}`;
      default: return `${price.toFixed(2)} ${currency}`;
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="loading-spinner mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">검색 중...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">검색 결과가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="responsive-table">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="table-header">
          <tr>
            <th className="table-cell text-left">상품 정보</th>
            <th 
              className="table-cell text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              onClick={() => handleSort('priceKRW')}
            >
              <div className="flex items-center">
                가격 (한화)
                <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
              </div>
            </th>
            <th 
              className="table-cell text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              onClick={() => handleSort('seller')}
            >
              <div className="flex items-center">
                판매자
                <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
              </div>
            </th>
            <th className="table-cell text-left">추가 정보</th>
            <th className="table-cell text-center">액션</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedProducts.map((product, index) => (
            <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              {/* 상품 정보 */}
              <td className="table-cell">
                <div className="flex items-start space-x-3">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                      {product.title}
                    </h3>
                    <div className="mt-1">
                      <span className={`site-badge site-${site}`}>
                        {site === '1688' ? '1688' : site.charAt(0).toUpperCase() + site.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </td>

              {/* 가격 */}
              <td className="table-cell">
                <div className="space-y-1">
                  <div className="price-krw">
                    ₩{product.priceKRW.toLocaleString()}
                  </div>
                  <div className="price-original">
                    {formatCurrency(product.price, product.currency)}
                  </div>
                </div>
              </td>

              {/* 판매자 */}
              <td className="table-cell">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {product.seller.name || '정보 없음'}
                  </div>
                  {product.seller.rating && (
                    <div className="flex items-center space-x-1">
                      <StarIcon className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {product.seller.rating}
                      </span>
                    </div>
                  )}
                  {product.seller.trustLevel && (
                    <div className={`text-xs ${getTrustLevelColor(product.seller.trustLevel)}`}>
                      {product.seller.trustLevel} Trust
                    </div>
                  )}
                </div>
              </td>

              {/* 추가 정보 */}
              <td className="table-cell">
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {product.minOrder && (
                    <div>최소 주문: {product.minOrder}개</div>
                  )}
                  {product.shipping && (
                    <div>배송: {product.shipping}</div>
                  )}
                  {product.seller.transactions && (
                    <div>거래수: {product.seller.transactions.toLocaleString()}</div>
                  )}
                </div>
              </td>

              {/* 액션 */}
              <td className="table-cell">
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={() => copyToClipboard(product.productUrl)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="링크 복사"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                  </button>
                  <a
                    href={product.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    title="새 탭에서 열기"
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductTable; 