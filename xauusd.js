import { Telegraf } from "telegraf";
import dotenv from 'dotenv';
import { fetchData } from "./price.js";
import { getCrudeOilFuturesPrice } from "./crudeprice.js";
import { getBTCUSDPrice } from "./bitcoinprice.js"; // 导入比特币价格获取函数

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

function BTCCOIN(result) { // 新增比特币价格消息发送函数
    const message = `
*BTC-USD*
Timestamp: ${result.Timestamp}
Last Close: ${result.LastClose}
BTC Price: ${result.BTCPrice}
Last Price: ${result.LastPrice}
Percent Change: ${result.PercentChange}
Today Trends: ${result.TodayTrends}
`;
    bot.telegram.sendMessage(process.env.CHANNEL_ID, message, { parse_mode: 'Markdown' });
}

let xauusdStatus = true;
let crudeStatus = true;
let btcStatus = true; // 新增比特币价格发送状态

function SendTimer(messageFunc, resultFunc, interval, delay, status) {
    setTimeout(() => {
        setInterval(async () => {
            if (!status()) return; // 使用状态函数来检查是否执行
            try {
                let result = await resultFunc();
                messageFunc(result);
            } catch (error) {
                console.error('Error fetching data:', error);
                bot.telegram.sendMessage(process.env.CHANNEL_ID, 'Error fetching data: ' + error.message);
            }
        }, interval);
    }, delay);
}

SendTimer(XAUUSD, fetchData, 1000 * 60 * 10, 0, () => xauusdStatus); // 每10分钟执行一次，立即启动
SendTimer(WTICRUDE, getCrudeOilFuturesPrice, 1000 * 60 * 10, 1000 * 60 * 5, () => crudeStatus); // 每10分钟执行一次，延迟5分钟启动
SendTimer(BTCCOIN, getBTCUSDPrice, 1000 * 60 * 10, 1000 * 60 * 2.5, () => btcStatus); // 每10分钟执行一次，延迟2.5分钟启动

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

bot.command('BTC', (ctx) => { // 新增比特币价格消息开关命令
    const arg = ctx.message.text.split(' ')[1];
    if (arg === '0') {
        btcStatus = false;
        ctx.reply('BTC messages disabled.');
    } else if (arg === '1') {
        btcStatus = true;
        ctx.reply('BTC messages enabled.');
    } else {
        ctx.reply('Invalid argument. Use /BTC 0 to disable or /BTC 1 to enable.');
    }
});

bot.launch();