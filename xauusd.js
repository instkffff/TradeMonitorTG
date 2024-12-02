import { Telegraf } from "telegraf";
import dotenv from 'dotenv';
import { fetchData, isMarketOpen } from "./price.js";

dotenv.config({ path: './config.env' });

const bot = new Telegraf(process.env.BOT_TOKEN);

function botSend(result) {
    const message = `
Timestamp: ${result.timestamp}
Last Close: ${result.lastClose}
Gold Price: ${result.goldPrice}
Last Price: ${result.lastPrice}
Percent Change: ${result.percentChange}
Today Trends: ${result.todayTrends}
`;
    bot.telegram.sendMessage(process.env.CHANNEL_ID, message);
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
    }, 1000 * 60 * 10); // 修改为每10分钟执行一次
}

bot.launch();