import React, { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import ProductTable from './ProductTable';
import { SearchResponse } from '../lib/types';

const SearchTab: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'alibaba' | 'dhgate' | '1688'>('alibaba');
  const [useVPN, setUseVPN] = useState(false);

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
        body: JSON.stringify({ 
          keyword: keyword.trim(),
          useVPN: useVPN 
        }),
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

          {/* VPN 크롤링 옵션 */}
          <div className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <input
              type="checkbox"
              id="useVPN"
              checked={useVPN}
              onChange={(e) => setUseVPN(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={loading}
            />
            <label htmlFor="useVPN" className="flex-1">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                🌐 VPN 크롤링 모드
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                VPN 연결 시 중국 사이트 접근성 향상 및 실제 크롤링 성공률 증가
              </div>
            </label>
            {useVPN && (
              <div className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                활성화
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading || !keyword.trim()}
            className={`w-full sm:w-auto ${
              useVPN 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'btn-primary'
            } px-6 py-2 rounded-lg font-medium transition-colors`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="loading-spinner mr-2" />
                {useVPN ? 'VPN 크롤링 중...' : '검색 중...'}
              </span>
            ) : (
              <>
                {useVPN ? '🌐 VPN 검색하기' : '🔍 검색하기'}
              </>
            )}
          </button>
        </form>
      </div>

      {/* VPN 상태 표시 */}
      {searchResults?.vpnMode && (
        <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              VPN 크롤링 모드로 검색되었습니다
            </span>
          </div>
        </div>
      )}

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
                    {searchResults.vpnMode && (
                      <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">VPN</span>
                    )}
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
              <p>• <strong>일반 모드:</strong> 기본 크롤링 (테스트 데이터 포함)</p>
              <p>• <strong>VPN 모드:</strong> 실제 크롤링 시도 (VPN 연결 시 성공률 향상)</p>
              <p>• 모든 가격은 한화로 환산하여 표시</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchTab; 