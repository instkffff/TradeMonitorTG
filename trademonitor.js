import { Telegraf } from 'telegraf';
import { config } from 'dotenv';

config({ path: './config.env' });

const bot = new Telegraf(process.env.BOT_TOKEN);

let markets = {}; // 用于存储所有市场的数据

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
    Object.keys(markets).forEach(async (market) => {
        await updateMarketData(market);
    });
}

// 定时更新市场数据
setInterval(collectMarketData, 1000 * 60 * 10); // 每10分钟刷新一次数据

/**
 * Telegram Bot 命令处理
 */
// /list 命令
bot.command('list', (ctx) => {
    let listMessage = `*Current Markets*\n`;
    Object.keys(markets).forEach((market) => {
        listMessage += `${market} - ${markets[market] ? 'Enabled' : 'Disabled'}\n`;
    });
    ctx.reply(listMessage, { parse_mode: 'Markdown' });
});

// /name 命令
bot.command('name', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length !== 3) {
        return ctx.reply('Usage: /name #品种序号# 品种名称');
    }
    const marketSymbol = args[1];
    const newMarketName = args[2];

    // 检查市场是否存在
    if (!markets[marketSymbol]) {
        ctx.reply(`Market ${marketSymbol} not found.`);
        return;
    }

    // 使用命名后的品种名称发送数据
    const result = markets[marketSymbol];
    bot.telegram.sendMessage(process.env.CHANNEL_ID, `*${newMarketName}*\n${result}`, { parse_mode: 'Markdown' });
});

// /add 命令
bot.command('add', async (ctx) => {
    const marketSymbol = ctx.message.text.split(' ')[1];
    if (!markets[marketSymbol]) {
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
    const marketSymbol = ctx.message.text.split(' ')[1];
    if (!markets[marketSymbol]) {
        ctx.reply(`Market not found.`);
    } else {
        delete markets[marketSymbol];
        ctx.reply(`Removed market: ${marketSymbol}`);
    }
});

// /enable 命令
bot.command('enable', (ctx) => {
    const marketSymbol = ctx.message.text.split(' ')[1];
    if (!markets[marketSymbol]) {
        ctx.reply(`Market not found.`);
    } else {
        markets[marketSymbol] = null;
        ctx.reply(`Enabled market: ${marketSymbol}`);
    }
});

// /disable 命令
bot.command('disable', (ctx) => {
    const marketSymbol = ctx.message.text.split(' ')[1];
    if (!markets[marketSymbol]) {
        ctx.reply(`Market not found.`);
    } else {
        delete markets[marketSymbol];
        ctx.reply(`Disabled market: ${marketSymbol}`);
    }
});

// 运行 Bot
bot.launch();