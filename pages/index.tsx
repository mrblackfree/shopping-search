import React, { useState } from 'react';
import Layout from '../components/Layout';
import SearchTab from '../components/SearchTab';
import AnalyzeTab from '../components/AnalyzeTab';

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'search' | 'analyze'>('search');

  const tabs = [
    { 
      key: 'search' as const, 
      name: '🔍 키워드로 찾기', 
      description: '한국어 키워드로 3개 사이트 동시 검색' 
    },
    { 
      key: 'analyze' as const, 
      name: '📎 URL로 분석하기', 
      description: '상품 URL 붙여넣어 분석 및 대안 추천' 
    }
  ];

  return (
    <Layout title="중국 도매 상품 검색 - 최저가 비교">
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            중국 도매 상품 검색
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Alibaba, 1688, DHgate에서 최저가 상품을 한 번에 찾아보세요
          </p>
          
          {/* 환율 정보 표시 영역 */}
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            💱 실시간 환율 적용 | USD/CNY → KRW 자동 변환
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex justify-center space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 px-6 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg mb-1">{tab.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {tab.description}
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="mt-6">
          {activeTab === 'search' ? (
            <SearchTab />
          ) : (
            <AnalyzeTab />
          )}
        </div>

        {/* 사용법 안내 */}
        <div className="card p-6 mt-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            💡 사용법 안내
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                🔍 키워드 검색
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• 한국어로 상품명을 입력하세요</li>
                <li>• AI가 자동으로 영어/중국어로 번역</li>
                <li>• 3개 사이트에서 동시 검색</li>
                <li>• 가격은 실시간 환율로 한화 변환</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                📎 URL 분석
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• 상품 URL을 붙여넣으세요</li>
                <li>• AI가 상품 정보를 한글로 요약</li>
                <li>• 다른 사이트에서 더 저렴한 대안 검색</li>
                <li>• 절약 금액과 비율을 표시</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 지원 사이트 정보 */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <div className="site-badge site-alibaba text-lg mb-2">Alibaba</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              글로벌 B2B 플랫폼<br />
              영어 검색 | USD 가격
            </p>
          </div>
          <div className="card p-4 text-center">
            <div className="site-badge site-dhgate text-lg mb-2">DHgate</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              소량 도매 전문<br />
              영어 검색 | USD 가격
            </p>
          </div>
          <div className="card p-4 text-center">
            <div className="site-badge site-1688 text-lg mb-2">1688</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              중국 내수 도매<br />
              중국어 검색 | CNY 가격
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage; 