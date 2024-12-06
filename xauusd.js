import { Telegraf } from "telegraf";
import dotenv from 'dotenv';
import { fetchData, isMarketOpen } from "./price.js";
import { getCrudeOilFuturesPrice } from "./crudeprice.js";

dotenv.config({ path: './config.env' });

const bot = new Telegraf(process.env.BOT_TOKEN);

function botSend(result) {
    const message = `
**XAUUSD**
Timestamp: ${result.timestamp}
Last Close: ${result.lastClose}
Gold Price: ${result.goldPrice}
Last Price: ${result.lastPrice}
Percent Change: ${result.percentChange}
Today Trends: ${result.todayTrends}
`;
    bot.telegram.sendMessage(process.env.CHANNEL_ID, message, { parse_mode: 'Markdown' });
}

function botSend1(result) {
    const message = `
**WTI CRUDE**
Timestamp: ${result.Timestamp}
Last Close: ${result.LastClose}
Crude Price: ${result.CrudePrice}
Last Price: ${result.LastPrice}
Percent Change: ${result.PercentChange}
Today Trends: ${result.TodayTrends}
`;
    bot.telegram.sendMessage(process.env.CHANNEL_ID, message, { parse_mode: 'Markdown' });
}

if (isMarketOpen()) {
    setInterval(async () => {
        try {
            let result = await fetchData();
            botSend(result);
        } catch (error) {
            console.error('Error fetching data:', error);
            bot.telegram.sendMessage(process.env.CHANNEL_ID, 'Error fetching data: ' + error.message);
        }
    }, 1000 * 60 * 10); // 每10分钟执行一次
}

// 启动第二个定时任务，延迟5分钟后开始
setTimeout(() => {
    setInterval(async () => {
        try {
            let result = await getCrudeOilFuturesPrice();
            botSend1(result);
        } catch (error) {
            console.error('Error fetching data:', error);
            bot.telegram.sendMessage(process.env.CHANNEL_ID, 'Error fetching data: ' + error.message);
        }
    }, 1000 * 60 * 10); // 每10分钟执行一次
}, 1000 * 60 * 5); // 延迟5分钟启动

bot.launch();