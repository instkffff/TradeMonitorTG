import yf from 'yahoo-finance2';
import moment from 'moment-timezone';

let lastBTCPrice = null;

/**
 * 获取 BTC-USD 价格
 * @returns {Promise<Object>} 包含 BTC-USD 价格数据的对象
 */
async function getBTCUSDPrice() {
    try {
        const queryOptions = { modules: ['price'] };
        const data = await yf.quote('BTC-USD', queryOptions);

        // 获取当前 BTC-USD 价格
        const currentBTCPrice = data.regularMarketPrice;

        // 计算百分比变化
        let percentChange;
        if (lastBTCPrice !== null) {
            percentChange = ((currentBTCPrice - lastBTCPrice) / lastBTCPrice) * 100;
            percentChange = parseFloat(percentChange).toFixed(2); // 转换为数字并限制为2位小数
        } else {
            percentChange = 'N/A';
        }

        // 提取所需字段
        const result = {
            Timestamp: moment().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss'),
            LastClose: data.regularMarketPreviousClose,
            BTCPrice: currentBTCPrice,
            LastPrice: lastBTCPrice,
            PercentChange: percentChange,
            TodayTrends: data.regularMarketChangePercent
        };

        // 更新上次获取的价格
        lastBTCPrice = currentBTCPrice;

        return result;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // 抛出错误以便调用者处理
    }
}

export { getBTCUSDPrice };