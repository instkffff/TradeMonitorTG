import { Telegraf } from "telegraf";
import dotenv from 'dotenv';
import { getMarketPrice } from "./pricequery.js";

dotenv.config({ path: './config.env' });

const bot = new Telegraf(process.env.BOT_TOKEN);

/**
 * 发送 XAUUSD 价格数据（替换为 GC=F）
 */
function XAUUSD(result) {
    const message = `
*GC=F*
Timestamp: ${result.Timestamp}
Last Close: ${result.LastClose}
Current Price: ${result.CurrentPrice}
Last Price: ${result.LastPrice}
Percent Change: ${result.PercentChange}
Today Trends: ${result.TodayTrends}
`;
    bot.telegram.sendMessage(process.env.CHANNEL_ID, message, { parse_mode: 'Markdown' });
}

/**
 * 发送 WTI 原油价格数据
 */
function WTICRUDE(result) {
    const message = `
*WTI CRUDE*
Timestamp: ${result.Timestamp}
Last Close: ${result.LastClose}
Current Price: ${result.CurrentPrice}
Last Price: ${result.LastPrice}
Percent Change: ${result.PercentChange}
Today Trends: ${result.TodayTrends}
`;
    bot.telegram.sendMessage(process.env.CHANNEL_ID, message, { parse_mode: 'Markdown' });
}

/**
 * 发送 BTC-USD 价格数据
 */
function BTCCOIN(result) {
    const message = `
*BTC-USD*
Timestamp: ${result.Timestamp}
Last Close: ${result.LastClose}
Current Price: ${result.CurrentPrice}
Last Price: ${result.LastPrice}
Percent Change: ${result.PercentChange}
Today Trends: ${result.TodayTrends}
`;
    bot.telegram.sendMessage(process.env.CHANNEL_ID, message, { parse_mode: 'Markdown' });
}

let xauusdStatus = true;
let crudeStatus = true;
let btcStatus = false; // 修正状态变量名

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

// 启动定时任务
SendTimer(XAUUSD, getMarketPrice.bind(getMarketPrice, 'GC=F'), 1000 * 60 * 10, 0, () => xauusdStatus); // 每10分钟执行一次，立即启动
SendTimer(WTICRUDE, getMarketPrice.bind(getMarketPrice, 'CL=F'), 1000 * 60 * 10, 1000 * 60 * 5, () => crudeStatus); // 每10分钟执行一次，延迟5分钟启动
SendTimer(BTCCOIN, getMarketPrice.bind(getMarketPrice, 'BTC-USD'), 1000 * 60 * 10, 1000 * 60 * 2.5, () => btcStatus); // 每10分钟执行一次，延迟2.5分钟启动

// 命令处理
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

bot.command('BTC', (ctx) => {
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

bot.command('List', (ctx) => { // 新增 /List 命令
    const statusMessage = `
*XAUUSD Status:* ${xauusdStatus ? 'Enabled' : 'Disabled'}
*CRUDE Status:* ${crudeStatus ? 'Enabled' : 'Disabled'}
*BTC Status:* ${btcStatus ? 'Enabled' : 'Disabled'}
`;
    ctx.reply(statusMessage, { parse_mode: 'Markdown' });
});

bot.launch();