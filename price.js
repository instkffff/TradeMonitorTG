import https from 'https';
import moment from 'moment-timezone';

// 定义API URL
const apiUrl = 'https://data-asg.goldprice.org/dbXRates/USD';

// 存储上一次的结果
let lastPrice = null;

/**
 * 检查是否在市场开放时间内
 * @returns {boolean} 市场是否开放
 */
function isMarketOpen() {
    const now = moment().tz('America/New_York');
    const dayOfWeek = now.day(); // 0 (Sunday) to 6 (Saturday)
    const hour = now.hour();
    const minute = now.minute();

    // 周一至周五，18:05 - 16:59 UTC
    return (dayOfWeek >= 1 && dayOfWeek <= 5) &&
           ((hour === 18 && minute >= 5) || (hour > 18) ||
            (hour === 16 && minute < 59) || (hour < 16));
}

/**
 * 发送请求并处理响应
 * @returns {Promise<Object>} 包含时间戳、上次收盘价、黄金价格、上次价格和百分比变化的对象
 */
async function fetchData() {
    try {
        const data = await makeRequest(apiUrl);

        // 获取当前时间戳
        const timestamp = moment().tz('America/New_York').format('YYYY-MM-DD HH:mm:ss');

        // 提取 goldPrice, todayTrends 和 lastClose
        const goldPrice = data.items[0].xauPrice;
        const lastClose = data.items[0].xauClose;

        console.log('Timestamp:', timestamp);
        console.log('Last Close:', lastClose);
        console.log('Gold Price:', goldPrice);

        let percentChange = 'N/A';
        if (lastPrice !== null) {
            console.log('Last Price:', lastPrice);
            percentChange = calculatePercentChange(lastPrice, goldPrice);
            console.log('Percent Change:', percentChange);
        }

        // 保存当前结果为上一次结果
        lastPrice = goldPrice;

        // 返回包含所需数据的对象
        return {
            timestamp,
            lastClose,
            goldPrice,
            lastPrice,
            percentChange
        };
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // 抛出错误以便调用者处理
    }
}

/**
 * 使用 https 模块发送请求
 * @param {string} url 请求的URL
 * @returns {Promise<Object>} 解析后的JSON数据
 */
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = '';

            // 当接收到数据时，将其累加到 data 变量中
            response.on('data', (chunk) => {
                data += chunk;
            });

            // 当数据接收完成时，解析 JSON 并 resolve
            response.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * 计算百分比变化
 * @param {number} oldValue 旧值
 * @param {number} newValue 新值
 * @returns {string} 百分比变化，保留两位小数
 */
function calculatePercentChange(oldValue, newValue) {
    if (!oldValue || !newValue) return '0.00';
    const change = (newValue - oldValue) / oldValue * 100;
    return change.toFixed(2); // 保留两位小数
}

async function test() {
    try {
        const dataList = await fetchData();
        console.log(dataList);
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();

export { fetchData, isMarketOpen };