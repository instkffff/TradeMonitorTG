import { moment } from 'moment-timezone';

// 假设你有一个 pricequery.js 文件，其中包含 getMarketPrice 函数
import { getMarketPrice } from './pricequery.js';

/**
 * 测试获取市场价格信息的脚本
 */
const testGetMarketPrice = async (symbol) => {
    try {
        const currentTime = moment().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss');
        const data = await getMarketPrice(symbol);

        console.log(`--- Test for symbol: ${symbol} ---`);
        console.log(`Timestamp: ${currentTime}`);
        console.log(`Last Close: ${data.LastClose}`);
        console.log(`Current Price: ${data.CurrentPrice}`);
        console.log(`Last Price: ${data.LastPrice}`);
        console.log(`Percent Change: ${data.PercentChange}`);
        console.log(`Today Trends: ${data.TodayTrends}`);
    } catch (error) {
        console.error(`Error fetching data for symbol ${symbol} - ${error.message}`);
    }
};

// 定义商品代码列表
const symbols = ['GC=F', 'CL=F', 'BTC-USD'];

// 执行测试
const runTests = async () => {
    for (const symbol of symbols) {
        // 第一次执行
        console.log(`Running first test for symbol: ${symbol}`);
        await testGetMarketPrice(symbol);
        await new Promise(resolve => setTimeout(resolve, 5000)); // 间隔5秒

        // 第二次执行
        console.log(`Running second test for symbol: ${symbol}`);
        await testGetMarketPrice(symbol);
        console.log('Second test completed. Moving to next symbol.');
    }
};

runTests();