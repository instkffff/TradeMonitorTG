import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import { getMarketPrice } from './pricequery.js';

config({ path: './config.env' });

const bot = new Telegraf(process.env.BOT_TOKEN);

let markets = {}; // 用于存储所有市场的数据
let marketNames = {}; // 用于存储市场名称
let marketTimers = {}; // 用于存储每个市场的定时器ID

/**
 * 发送市场数据
 * @param {string} market - 市场符号
 */
async function sendMarketData(market) {
    try {
        const result = await getMarketPrice(market);
        if (result !== null) {
            const name = marketNames[market] || market;
            let message = `*${name}*\n`;
            message += `Timestamp: ${result.Timestamp}\n`;
            message += `LastClose: ${result.LastClose}\n`;
            message += `CurrentPrice: ${result.CurrentPrice}\n`;
            message += `LastPrice: ${result.LastPrice}\n`;
            message += `PercentChange: ${result.PercentChange}\n`;
            message += `TodayTrends: ${result.TodayTrends}\n\n`;
            bot.telegram.sendMessage(process.env.CHANNEL_ID, message, { parse_mode: 'Markdown' });
        } else {
            bot.telegram.sendMessage(process.env.CHANNEL_ID, `*${market}*: Disabled\n\n`, { parse_mode: 'Markdown' });
        }
    } catch (error) {
        console.error(`Error sending data for market ${market}:`, error);
        bot.telegram.sendMessage(process.env.CHANNEL_ID, `*${market}*: Error\n\n`, { parse_mode: 'Markdown' });
    }
}

/**
 * 设置市场定时器
 * @param {string} market - 市场符号
 * @param {number} interval - 时间间隔（分钟）
 */
function setMarketTimer(market, interval) {
    const intervalTime = interval * 1000 * 60;
    marketTimers[market] = setInterval(() => sendMarketData(market), intervalTime);
}

/**
 * 收集市场数据并设置定时器
 */
async function collectMarketData() {
    for (const market of Object.keys(markets)) {
        // 清除之前的定时器
        if (marketTimers[market]) {
            clearInterval(marketTimers[market]);
        }

        // 设置新的定时器，默认间隔时间为3分钟
        setMarketTimer(market, process.env.TIMER_INTERVAL || 3);
    }
}

// /timer 命令
bot.command('timer', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length !== 3) {
        return ctx.reply('Usage: /timer #品种序号# 时间间隔(分钟)');
    }
    const index = parseInt(args[1], 10);
    const newInterval = parseInt(args[2], 10);

    if (isNaN(newInterval) || newInterval <= 0) {
        return ctx.reply('时间间隔必须是大于0的整数');
    }

    const marketSymbol = getMarketByIndex(index);
    if (!marketSymbol) {
        ctx.reply(`Market with index ${index} not found.`);
        return;
    }

    // 清除之前的定时器
    if (marketTimers[marketSymbol]) {
        clearInterval(marketTimers[marketSymbol]);
    }

    // 设置新的定时器
    setMarketTimer(marketSymbol, newInterval);

    ctx.reply(`Set timer for market ${marketSymbol} to ${newInterval} minutes`);
});

// 初始化市场数据和定时器
collectMarketData().then(() => {
    console.log('Market data and timers initialized');
});

/**
 * 根据序号获取市场符号
 * @param {number} index - 市场序号
 * @returns {string|null} 市场符号或null
 */
function getMarketByIndex(index) {
    const marketKeys = Object.keys(markets);
    if (index >= 1 && index <= marketKeys.length) {
        return marketKeys[index - 1];
    }
    return null;
}

/**
 * Telegram Bot 命令处理
 */
// /list 命令
bot.command('list', (ctx) => {
    let listMessage = `*Current Markets*\n`;
    let index = 1;
    for (const market of Object.keys(markets)) {
        const name = marketNames[market] || 'N/A';
        listMessage += `${index}. ${market} (${name}) - ${markets[market] !== null ? 'Enabled' : 'Disabled'}\n`;
        index++;
    }
    ctx.reply(listMessage, { parse_mode: 'Markdown' });
});

// /name 命令
bot.command('name', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length !== 3) {
        return ctx.reply('Usage: /name #品种序号# 品种名称');
    }
    const index = parseInt(args[1].replace('#', ''), 10); // 移除 '#' 并转换为整数
    const newMarketName = args[2];

    const marketSymbol = getMarketByIndex(index);
    if (!marketSymbol) {
        ctx.reply(`Market with index ${index} not found.`);
        return;
    }

    // 存储市场名称
    marketNames[marketSymbol] = newMarketName;

    ctx.reply(`Set name for market ${marketSymbol} to ${newMarketName}`);
});

// /add 命令
bot.command('add', async (ctx) => {
    const marketSymbol = ctx.message.text.split(' ')[1];
    if (markets[marketSymbol] === undefined) {
        markets[marketSymbol] = null;
        ctx.reply(`Added market: ${marketSymbol}`);
    } else {
        ctx.reply(`Market ${marketSymbol} already exists.`);
    }
});

// /remove 命令
bot.command('remove', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length !== 2) {
        return ctx.reply('Usage: /remove #品种序号#');
    }
    const index = parseInt(args[1], 10);

    const marketSymbol = getMarketByIndex(index);
    if (!marketSymbol) {
        ctx.reply(`Market with index ${index} not found.`);
        return;
    }

    delete markets[marketSymbol];
    delete marketNames[marketSymbol]; // 删除市场名称
    ctx.reply(`Removed market: ${marketSymbol}`);
});

// /enable 命令
bot.command('enable', (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length !== 2) {
        return ctx.reply('Usage: /enable #品种序号#');
    }
    const index = parseInt(args[1], 10);

    const marketSymbol = getMarketByIndex(index);
    if (!marketSymbol) {
        ctx.reply(`Market with index ${index} not found.`);
        return;
    }

    markets[marketSymbol] = null; // 设置为null表示启用
    ctx.reply(`Enabled market: ${marketSymbol}`);
});

// /disable 命令
bot.command('disable', (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length !== 2) {
        return ctx.reply('Usage: /disable #品种序号#');
    }
    const index = parseInt(args[1], 10);

    const marketSymbol = getMarketByIndex(index);
    if (!marketSymbol) {
        ctx.reply(`Market with index ${index} not found.`);
        return;
    }

    markets[marketSymbol] = 'disabled'; // 设置为'disabled'表示禁用
    ctx.reply(`Disabled market: ${marketSymbol}`);
});

// 运行 Bot
bot.launch();