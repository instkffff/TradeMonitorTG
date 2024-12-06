import yf from 'yahoo-finance2';

/**
 * 获取原油期货价格
 * @returns {Promise<Object>} 包含原油期货价格数据的对象
 */
async function getCrudeOilFuturesPrice() {
    try {
        const queryOptions = { modules: ['price'] };
        const data = await yf.quote('CL=F', queryOptions);

        console.log(data);
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