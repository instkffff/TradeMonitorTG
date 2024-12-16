import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import { getMarketPrice } from './pricequery.js';
import fs from 'fs';
import path from 'path';

config({ path: './config.env' });

const bot = new Telegraf(process.env.BOT_TOKEN);

let markets = {}; // 用于存储所有市场的数据
let marketNames = {}; // 用于存储市场名称
let marketIndex = 0; // 当前处理的市场索引
let globalInterval = parseInt(process.env.TIMER_INTERVAL || 3, 10) * 1000 * 60; // 默认时间间隔为3分钟
let cycleSendMarketDataTimeout; // 定义定时器变量
let commandQueue = []; // 命令队列
let isProcessing = false; // 是否正在处理命令

const configFilePath = path.join('./marketConfig.json');

// 读取配置文件
function readConfig() {
    try {
        const data = fs.readFileSync(configFilePath, 'utf8');
        const config = JSON.parse(data);
        markets = config.markets || {};
        marketNames = config.marketNames || {};
    } catch (error) {
        console.error('Error reading marketConfig.json:', error);
    }
}

// 写入配置文件
function writeConfig() {
    const config = {
        markets,
        marketNames
    };
    fs.writeFile(configFilePath, JSON.stringify(config, null, 2), (err) => {
        if (err) {
            console.error('Error writing marketConfig.json:', err);
        }
    });
}

readConfig(); // 启动时读取配置

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
 * 循环发送市场数据
 */
function cycleSendMarketData() {
    const marketSymbols = Object.keys(markets).filter(market => markets[market] === null); // 只处理启用的市场
    if (marketSymbols.length === 0) {
        console.log('No enabled markets to send data.');
        return;
    }

    const currentMarket = marketSymbols[marketIndex];
    sendMarketData(currentMarket).then(() => {
        marketIndex = (marketIndex + 1) % marketSymbols.length; // 更新索引，循环到下一个市场
        cycleSendMarketDataTimeout = setTimeout(cycleSendMarketData, globalInterval); // 设置下一次发送的时间间隔
    });
}

/**
 * 处理命令队列中的下一个命令
 */
async function processCommandQueue() {
    if (isProcessing || commandQueue.length === 0) {
        return;
    }
    isProcessing = true;
    const { command, ctx, args } = commandQueue.shift();
    try {
        switch (command) {
            case 'timer':
                await handleTimerCommand(ctx, args);
                break;
            case 'list':
                await handleListCommand(ctx);
                break;
            case 'name':
                await handleNameCommand(ctx, args);
                break;
            case 'add':
                await handleAddCommand(ctx, args);
                break;
            case 'remove':
                await handleRemoveCommand(ctx, args);
                break;
            case 'enable':
                await handleEnableCommand(ctx, args);
                break;
            case 'disable':
                await handleDisableCommand(ctx, args);
                break;
            default:
                ctx.reply('Unknown command');
        }
    } catch (error) {
        console.error(`Error processing command ${command}:`, error);
        ctx.reply('An error occurred while processing your command.');
    } finally {
        isProcessing = false;
        processCommandQueue(); // 继续处理下一个命令
    }
}

/**
 * 处理 /timer 命令
 */
async function handleTimerCommand(ctx, args) {
    const newInterval = parseInt(args[1], 10);
    if (isNaN(newInterval) || newInterval <= 0) {
        return ctx.reply('时间间隔必须是大于0的整数');
    }

    globalInterval = newInterval * 1000 * 60;

    ctx.reply(`Set timer for all enabled markets to ${newInterval} minutes`);

    clearTimeout(cycleSendMarketDataTimeout);
    cycleSendMarketData();
}

/**
 * 处理 /list 命令
 */
async function handleListCommand(ctx) {
    let listMessage = `*Current Markets*\n`;
    let index = 1;
    for (const market of Object.keys(markets)) {
        const name = marketNames[market] || 'N/A';
        const status = markets[market] === null ? 'Enabled' : 'Disabled';
        listMessage += `${index}. ${market} (${name}) - ${status}\n`;
        index++;
    }
    ctx.reply(listMessage, { parse_mode: 'Markdown' });
}

/**
 * 处理 /name 命令
 */
async function handleNameCommand(ctx, args) {
    const index = parseInt(args[1].replace('#', ''), 10);
    const newMarketName = args[2];

    const marketSymbol = getMarketByIndex(index);
    if (!marketSymbol) {
        ctx.reply(`Market with index ${index} not found.`);
        return;
    }

    marketNames[marketSymbol] = newMarketName;
    writeConfig(); // 更新配置文件

    ctx.reply(`Set name for market ${marketSymbol} to ${newMarketName}`);
}

/**
 * 处理 /add 命令
 */
async function handleAddCommand(ctx, args) {
    const marketSymbol = args[1];
    if (markets[marketSymbol] === undefined) {
        markets[marketSymbol] = null;
        writeConfig(); // 更新配置文件

        ctx.reply(`Added market: ${marketSymbol}`);
    } else {
        ctx.reply(`Market ${marketSymbol} already exists.`);
    }
}

/**
 * 处理 /remove 命令
 */
async function handleRemoveCommand(ctx, args) {
    const index = parseInt(args[1], 10);

    const marketSymbol = getMarketByIndex(index);
    if (!marketSymbol) {
        ctx.reply(`Market with index ${index} not found.`);
        return;
    }

    delete markets[marketSymbol];
    delete marketNames[marketSymbol];
    writeConfig(); // 更新配置文件

    ctx.reply(`Removed market: ${marketSymbol}`);
}

/**
 * 处理 /enable 命令
 */
async function handleEnableCommand(ctx, args) {
    const index = parseInt(args[1], 10);

    const marketSymbol = getMarketByIndex(index);
    if (!marketSymbol) {
        ctx.reply(`Market with index ${index} not found.`);
        return;
    }

    markets[marketSymbol] = null;
    writeConfig(); // 更新配置文件

    ctx.reply(`Enabled market: ${marketSymbol}`);

    clearTimeout(cycleSendMarketDataTimeout);
    cycleSendMarketData();
}

/**
 * 处理 /disable 命令
 */
async function handleDisableCommand(ctx, args) {
    const index = parseInt(args[1], 10);

    const marketSymbol = getMarketByIndex(index);
    if (!marketSymbol) {
        ctx.reply(`Market with index ${index} not found.`);
        return;
    }

    markets[marketSymbol] = 'disabled';
    writeConfig(); // 更新配置文件

    ctx.reply(`Disabled market: ${marketSymbol}`);

    clearTimeout(cycleSendMarketDataTimeout);
    cycleSendMarketData();
}

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

// 注册命令处理器
bot.command('timer', (ctx) => {
    const args = ctx.message.text.split(' ');
    commandQueue.push({ command: 'timer', ctx, args });
    processCommandQueue();
});

bot.command('list', (ctx) => {
    commandQueue.push({ command: 'list', ctx });
    processCommandQueue();
});

bot.command('name', (ctx) => {
    const args = ctx.message.text.split(' ');
    commandQueue.push({ command: 'name', ctx, args });
    processCommandQueue();
});

bot.command('add', (ctx) => {
    const args = ctx.message.text.split(' ');
    commandQueue.push({ command: 'add', ctx, args });
    processCommandQueue();
});

bot.command('remove', (ctx) => {
    const args = ctx.message.text.split(' ');
    commandQueue.push({ command: 'remove', ctx, args });
    processCommandQueue();
});

bot.command('enable', (ctx) => {
    const args = ctx.message.text.split(' ');
    commandQueue.push({ command: 'enable', ctx, args });
    processCommandQueue();
});

bot.command('disable', (ctx) => {
    const args = ctx.message.text.split(' ');
    commandQueue.push({ command: 'disable', ctx, args });
    processCommandQueue();
});

// 初始化市场数据和定时器
cycleSendMarketData();

// 运行 Bot
bot.launch();