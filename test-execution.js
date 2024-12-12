import moment from 'moment-timezone';
import { getMarketPrice } from './pricequery.js';

// 初始化时区
const realm = 'Asia/Shanghai';

/**
 * 测试获取市场价格信息的脚本
 */
async function testGetMarketPrice(symbol) {
    try {
        const currentTime = moment().tz(realm).format('YYYY-MM-DD HH:mm:ss');
        const data = await getMarketPrice(symbol);

        console.log(`--- Test for symbol: ${symbol} ---`);
        console.log(`Timestamp: ${currentTime}`);
        console.log(`Last Close: ${data.LastClose}`);
        console.log(`Current Price: ${data.CurrentPrice}`);
        console.log(`Last Price: ${data.LastPrice}`);
        console.log(`Percent Change: ${data.PercentChange}`);
        console.log(`Today Trends: ${data.TodayTrends}`);
    } catch (error) {
        console.error(`Error fetching data for symbol ${symbol}: ${error.message}`);
    }
}

// 测试 XAUUSD 和 CL=F
testGetMarketPrice('GC=F');
testGetMarketPrice('CL=F');
testGetMarketPrice('BTC-USD');

testGetMarketPrice('GC=F');
testGetMarketPrice('CL=F');
testGetMarketPrice('BTC-USD');