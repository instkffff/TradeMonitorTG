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
            'Last Close': data.regularMarketPreviousClose,
            'Crude Price': currentCrudePrice,
            'Last Price': lastCrudePrice,
            'Percent Change': percentChange,
            'Today Trends': data.regularMarketChangePercent
        };

        // 更新上次获取的价格
        lastCrudePrice = currentCrudePrice;

        return result;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // 抛出错误以便调用者处理
    }
}

// 调用函数获取数据
getCrudeOilFuturesPrice().then(data => {
    console.log('Crude Oil Futures Data:', data);
}).catch(error => {
    console.error('Error:', error);
});

// 示例：每隔一段时间获取一次数据
setInterval(() => {
    getCrudeOilFuturesPrice().then(data => {
        console.log('Crude Oil Futures Data:', data);
    }).catch(error => {
        console.error('Error:', error);
    });
}, 60000); // 每分钟获取一次数据