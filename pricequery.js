import yf from 'yahoo-finance2';
import moment from 'moment-timezone';

let lastPrices = {}; // 用于存储上次获取的价格
const realm = 'Asia/Shanghai'; // 默认时区

/**
 * 获取市场价格信息
 * @param {string} symbol - 品种代码，例如 'CL=F'
 * @returns {Promise<Object>} 包含市场价格数据的对象
 */
async function getMarketPrice(symbol) {
    try {
        const queryOptions = { modules: ['price'] };
        const data = await yf.quote(symbol, queryOptions);

        // 获取当前市场价格
        const currentPrice = data.regularMarketPrice;

        // 计算百分比变化
        let percentChange;
        if (lastPrices[symbol] !== null) {
            percentChange = ((currentPrice - lastPrices[symbol]) / lastPrices[symbol]) * 100;
            percentChange = parseFloat(percentChange).toFixed(2); // 转换为数字并限制为2位小数
        } else {
            percentChange = 'N/A';
        }

        // 提取所需字段
        const result = {
            Timestamp: moment().tz(realm).format('YYYY-MM-DD HH:mm:ss'),
            LastClose: data.regularMarketPreviousClose || 'N/A',
            CurrentPrice: currentPrice,
            LastPrice: lastPrices[symbol] || 'N/A',
            PercentChange: percentChange,
            TodayTrends: data.regularMarketChangePercent
        };

        // 更新上次获取的价格
        lastPrices[symbol] = currentPrice;

        return result;
    } catch (error) {
        console.error(`Error fetching data for symbol ${symbol}:`, error);
        throw error; // 抛出错误以便调用者处理
    }
}

export { getMarketPrice };