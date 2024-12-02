import { Telegraf } from "telegraf";
import dotenv from 'dotenv';
import { fetchData, isMarketOpen } from "./price.js";

dotenv.config({ path: './config.env' });

const bot = new Telegraf(process.env.BOT_TOKEN);

function botSend(result) {
    bot.telegram.sendMessage(process.env.CHANNEL_ID, result);
}

if (isMarketOpen()) {
    setInterval(async () => {
        let result = await fetchData();
        botSend(result);
    }, 1000 * 60 * 10); // 修改为每10分钟执行一次
}