import yf from 'yahoo-finance2';

/**
 * 获取原油期货价格
 * @returns {Promise<Object>} 包含原油期货价格数据的对象
 */
async function getCrudeOilFuturesPrice() {
    try {
        const queryOptions = { modules: ['price'] };
        const data = await yf.quote('CL=F', queryOptions);

        console.log('Timestamp:', data.timestamp);
        console.log('Open:', data.regularMarketOpen.fmt);
        console.log('High:', data.regularMarketDayHigh.fmt);
        console.log('Low:', data.regularMarketDayLow.fmt);
        console.log('Close:', data.regularMarketPreviousClose.fmt);
        console.log('Volume:', data.regularMarketVolume.fmt);

        return {
            timestamp: data.timestamp,
            open: data.regularMarketOpen.fmt,
            high: data.regularMarketDayHigh.fmt,
            low: data.regularMarketDayLow.fmt,
            close: data.regularMarketPreviousClose.fmt,
            volume: data.regularMarketVolume.fmt
        };
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