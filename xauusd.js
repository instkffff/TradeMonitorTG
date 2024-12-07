import { Telegraf } from "telegraf";
import dotenv from 'dotenv';
import { fetchData } from "./price.js";
import { getCrudeOilFuturesPrice } from "./crudeprice.js";

dotenv.config({ path: './config.env' });

const bot = new Telegraf(process.env.BOT_TOKEN);

function XAUUSD(result) {
    const message = `
*XAUUSD*
Timestamp: ${result.timestamp}
Last Close: ${result.lastClose}
Gold Price: ${result.goldPrice}
Last Price: ${result.lastPrice}
Percent Change: ${result.percentChange}
Today Trends: ${result.todayTrends}
`;
    bot.telegram.sendMessage(process.env.CHANNEL_ID, message, { parse_mode: 'Markdown' });
}

function WTICRUDE(result) {
    const message = `
*WTI CRUDE*
Timestamp: ${result.Timestamp}
Last Close: ${result.LastClose}
Crude Price: ${result.CrudePrice}
Last Price: ${result.LastPrice}
Percent Change: ${result.PercentChange}
Today Trends: ${result.TodayTrends}
`;
    bot.telegram.sendMessage(process.env.CHANNEL_ID, message, { parse_mode: 'Markdown' });
}

let xauusdStatus = true;
let crudeStatus = true;

function SendTimer(func, interval, delay, status) {
    setTimeout(() => {
        setInterval(async () => {
            if (!status()) return; // 使用状态函数来检查是否执行
            try {
                let result = await func();
                func(result);
            } catch (error) {
                console.error('Error fetching data:', error);
                bot.telegram.sendMessage(process.env.CHANNEL_ID, 'Error fetching data: ' + error.message);
            }
        }, interval);
    }, delay);
}

SendTimer(() => fetchData().then(XAUUSD), 1000 * 60 * 10, 0, () => xauusdStatus); // 每10分钟执行一次，立即启动
SendTimer(() => getCrudeOilFuturesPrice().then(WTICRUDE), 1000 * 60 * 10, 1000 * 60 * 5, () => crudeStatus); // 每10分钟执行一次，延迟5分钟启动

bot.command('XAUUSD', (ctx) => {
    const arg = ctx.message.text.split(' ')[1];
    if (arg === '0') {
        xauusdStatus = false;
        ctx.reply('XAUUSD messages disabled.');
    } else if (arg === '1') {
        xauusdStatus = true;
        ctx.reply('XAUUSD messages enabled.');
    } else {
        ctx.reply('Invalid argument. Use /XAUUSD 0 to disable or /XAUUSD 1 to enable.');
    }
});

bot.command('CRUDE', (ctx) => {
    const arg = ctx.message.text.split(' ')[1];
    if (arg === '0') {
        crudeStatus = false;
        ctx.reply('CRUDE messages disabled.');
    } else if (arg === '1') {
        crudeStatus = true;
        ctx.reply('CRUDE messages enabled.');
    } else {
        ctx.reply('Invalid argument. Use /CRUDE 0 to disable or /CRUDE 1 to enable.');
    }
});

bot.launch();