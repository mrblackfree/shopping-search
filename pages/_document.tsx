import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="author" content="중국 도매 상품 검색" />
        <meta name="keywords" content="중국 도매, 알리바바, 1688, DHgate, 최저가, 상품검색" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
} 