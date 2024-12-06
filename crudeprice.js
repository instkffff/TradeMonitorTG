import yf from 'yahoo-finance2';
import moment from 'moment-timezone';

let lastCrudePrice = null;

/**
 * 获取原油期货价格
 * @returns {Promise<Object>} 包含原油期货价格数据的对象
 */
async function getCrudeOilFuturesPrice() {
    try {
        const queryOptions = { modules: ['price'] };
        const data = await yf.quote('CL=F', queryOptions);

        // 获取当前原油期货价格
        const currentCrudePrice = data.regularMarketPrice;

        // 计算百分比变化
        let percentChange = 'N/A';
        if (lastCrudePrice !== null) {
            percentChange = ((currentCrudePrice - lastCrudePrice) / lastCrudePrice) * 100;
        }

        // 提取所需字段
        const result = {
            Timestamp: moment().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss'),
            LastClose: data.regularMarketPreviousClose,
            CrudePrice: currentCrudePrice,
            LastPrice: lastCrudePrice,
            PercentChange: parseFloat(percentChange.toFixed(2)),
            TodayTrends: data.regularMarketChangePercent
        };

        // 更新上次获取的价格
        lastCrudePrice = currentCrudePrice;

        return result;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // 抛出错误以便调用者处理
    }
}

export { getCrudeOilFuturesPrice };