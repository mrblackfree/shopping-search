const { searchDHgate, analyzeDHgateProduct } = require('./lib/scrapers/dhgate');
const { searchAlibaba, analyzeAlibabaProduct } = require('./lib/scrapers/alibaba');
const { search1688, analyze1688Product } = require('./lib/scrapers/china1688');

// Playwright 기반 크롤링 테스트
async function testPlaywrightCrawling() {
  console.log('🎭 Playwright 크롤링 테스트 시작...\n');
  
  const keyword = 'wireless earphones';
  
  // 1. DHgate 테스트
  console.log('🔍 DHgate 테스트...');
  try {
    const dhgateResults = await searchDHgate(keyword);
    console.log(`✅ DHgate: ${dhgateResults.totalResults}개 상품 발견`);
    console.log('상품 예시:', dhgateResults.products[0]?.title || '없음');
  } catch (error) {
    console.error('❌ DHgate 오류:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // 2. Alibaba 테스트
  console.log('🔍 Alibaba 테스트...');
  try {
    const alibabaResults = await searchAlibaba(keyword);
    console.log(`✅ Alibaba: ${alibabaResults.totalResults}개 상품 발견`);
    console.log('상품 예시:', alibabaResults.products[0]?.title || '없음');
  } catch (error) {
    console.error('❌ Alibaba 오류:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // 3. 1688 테스트
  console.log('🔍 1688 테스트...');
  try {
    const china1688Results = await search1688(keyword);
    console.log(`✅ 1688: ${china1688Results.totalResults}개 상품 발견`);
    console.log('상품 예시:', china1688Results.products[0]?.title || '없음');
  } catch (error) {
    console.error('❌ 1688 오류:', error.message);
  }
  
  console.log('\n🎉 Playwright 크롤링 테스트 완료!');
}

// 개별 사이트 테스트 함수들
async function testDHgateOnly() {
  console.log('🔍 DHgate 단독 테스트...');
  try {
    const results = await searchDHgate('bluetooth headphones');
    console.log('결과:', JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('오류:', error);
  }
}

async function testAlibabaOnly() {
  console.log('🔍 Alibaba 단독 테스트...');
  try {
    const results = await searchAlibaba('smartphone');
    console.log('결과:', JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('오류:', error);
  }
}

async function test1688Only() {
  console.log('🔍 1688 단독 테스트...');
  try {
    const results = await search1688('手机');
    console.log('결과:', JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('오류:', error);
  }
}

// 실행
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--dhgate')) {
    testDHgateOnly();
  } else if (args.includes('--alibaba')) {
    testAlibabaOnly();
  } else if (args.includes('--1688')) {
    test1688Only();
  } else {
    testPlaywrightCrawling();
  }
} 