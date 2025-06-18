import React, { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import ProductTable from './ProductTable';
import { SearchResponse } from '../lib/types';

const SearchTab: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'alibaba' | 'dhgate' | '1688'>('alibaba');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!keyword.trim()) {
      alert('검색 키워드를 입력해주세요.');
      return;
    }

    setLoading(true);
    setSearchResults(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });

      const data: SearchResponse = await response.json();
      
      if (data.success && data.data) {
        setSearchResults(data);
      } else {
        alert(data.error || '검색 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('검색 오류:', error);
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'alibaba' as const, name: 'Alibaba', color: 'site-alibaba' },
    { key: 'dhgate' as const, name: 'DHgate', color: 'site-dhgate' },
    { key: '1688' as const, name: '1688', color: 'site-1688' }
  ];

  return (
    <div className="space-y-6">
      {/* 검색 폼 */}
      <div className="card p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label htmlFor="keyword" className="block text-sm font-medium mb-2">
              상품 키워드 (한국어)
            </label>
            <div className="relative">
              <input
                type="text"
                id="keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="예: 무선 이어폰, 스마트폰 케이스, LED 조명"
                className="input-field pr-12"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !keyword.trim()}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-primary-600 hover:text-primary-700 disabled:text-gray-400"
              >
                {loading ? (
                  <div className="loading-spinner" />
                ) : (
                  <MagnifyingGlassIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading || !keyword.trim()}
            className="btn-primary w-full sm:w-auto"
          >
            {loading ? '검색 중...' : '🔍 검색하기'}
          </button>
        </form>
      </div>

      {/* 검색 결과 */}
      {searchResults && searchResults.data && (
        <div className="space-y-4">
          {/* 탭 네비게이션 */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const results = searchResults.data![tab.key];
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <span className={`site-badge ${tab.color} mr-2`}>
                      {tab.name}
                    </span>
                    ({results.totalResults}개)
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 활성 탭 콘텐츠 */}
          <div className="card">
            <ProductTable 
              products={searchResults.data[activeTab].products}
              site={activeTab}
              loading={false}
            />
          </div>
        </div>
      )}

      {/* 검색 전 안내 */}
      {!searchResults && !loading && (
        <div className="card p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">상품 검색을 시작해보세요</h3>
            <p className="text-sm">
              한국어로 상품명을 입력하면 Alibaba, DHgate, 1688에서 자동으로 검색됩니다.
            </p>
            <div className="mt-4 text-xs space-y-1">
              <p>• Alibaba, DHgate: 영어로 번역하여 검색</p>
              <p>• 1688: 중국어로 번역하여 검색</p>
              <p>• 모든 가격은 한화로 환산하여 표시</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchTab; 