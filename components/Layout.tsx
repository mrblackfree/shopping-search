import React from 'react';
import Head from 'next/head';
import { ThemeProvider } from 'next-themes';
import ThemeToggle from './ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title = '중국 도매 상품 검색' }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Head>
          <title>{title}</title>
          <meta name="description" content="중국 및 글로벌 도매 사이트에서 최저가 상품을 검색하세요" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        {/* 헤더 */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  🛒 도매 상품 검색
                </h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* 푸터 */}
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              <p>
                © 2024 중국 도매 상품 검색. 
                <span className="ml-2">
                  Alibaba, 1688, DHgate에서 최저가를 찾아보세요.
                </span>
              </p>
              <p className="mt-2 text-xs">
                ⚠️ 가격 정보는 실시간으로 변동될 수 있으며, 실제 구매 시 확인이 필요합니다.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
};

export default Layout; 