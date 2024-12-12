import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import { getMarketPrice } from './pricequery.js';

config({ path: './config.env' });

const bot = new Telegraf(process.env.BOT_TOKEN);

let markets = {}; // 用于存储所有市场的数据
let marketNames = {}; // 用于存储市场名称

/**
 * 更新市场数据
 */
async function updateMarketData(market) {
    try {
        const result = await getMarketPrice(market);
        markets[market] = result;
    } catch (error) {
        console.error(`Error fetching data for market ${market}:`, error);
        markets[market] = null;
    }
}

/**
 * 收集市场数据
 */
async function collectMarketData() {
    for (const market of Object.keys(markets)) {
        await updateMarketData(market);
    }
}

/**
 * 发送市场数据到Telegram频道
 */
async function sendMarketData() {
    await collectMarketData(); // 先收集数据
    const marketKeys = Object.keys(markets);
    const intervalTime = 1000 * 60 * 10 / marketKeys.length; // 计算每个市场的发送间隔时间

    let currentIndex = 0;

    function sendNextMarket() {
        if (currentIndex < marketKeys.length) {
            const market = marketKeys[currentIndex];
            const name = marketNames[market] || 'N/A';
            const result = markets[market] !== null ? markets[market] : 'Disabled';
            if (result !== 'Disabled') {
                let message = `*${name}*\n`;
                message += `Timestamp: ${result.Timestamp}\n`;
                message += `LastClose: ${result.LastClose}\n`;
                message += `CurrentPrice: ${result.CurrentPrice}\n`;
                message += `LastPrice: ${result.LastPrice}\n`;
                message += `PercentChange: ${result.PercentChange}\n`;
                message += `TodayTrends: ${result.TodayTrends}\n\n`;
                bot.telegram.sendMessage(process.env.CHANNEL_ID, message, { parse_mode: 'Markdown' });
            } else {
                bot.telegram.sendMessage(process.env.CHANNEL_ID, `*${name} (${market})*: Disabled\n\n`, { parse_mode: 'Markdown' });
            }
            currentIndex++;
            setTimeout(sendNextMarket, intervalTime);
        }
    }

    sendNextMarket();
}

// 定时发送市场数据
setInterval(sendMarketData, 1000 * 60 * 10); // 每10分钟发送一次数据

/**
 * 根据序号获取市场符号
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
    const index = parseInt(args[1], 10);
    const newMarketName = args[2];

    const marketSymbol = getMarketByIndex(index);
    if (!marketSymbol) {
        ctx.reply(`Market with index ${index} not found.`);
        return;
    }

    // 存储市场名称
    marketNames[marketSymbol] = newMarketName;

    // 使用命名后的品种名称发送数据
    const result = markets[marketSymbol];
    bot.telegram.sendMessage(process.env.CHANNEL_ID, `*${newMarketName}*\n${result}`, { parse_mode: 'Markdown' });
    ctx.reply(`Set name for market ${marketSymbol} to ${newMarketName}`);
});

// /add 命令
bot.command('add', async (ctx) => {
    const marketSymbol = ctx.message.text.split(' ')[1];
    if (markets[marketSymbol] === undefined) {
        try {
            markets[marketSymbol] = null;
            await updateMarketData(marketSymbol); // 立即更新新增市场的数据
            ctx.reply(`Added market: ${marketSymbol}`);
        } catch (error) {
            console.error(`Failed to add market ${marketSymbol}:`, error);
            ctx.reply(`Failed to add ${marketSymbol}`);
        }
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