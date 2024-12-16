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
        await handleCommand(ctx, command, args);
    } catch (error) {
        console.error(`Error processing command ${command}:`, error);
        ctx.reply('An error occurred while processing your command.');
    } finally {
        isProcessing = false;
        processCommandQueue(); // 继续处理下一个命令
    }
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

/**
 * 验证正整数
 * @param {string} value - 要验证的值
 * @returns {number|null} 验证后的正整数或null
 */
function validatePositiveInteger(value) {
    const num = parseInt(value, 10);
    return isNaN(num) || num <= 0 ? null : num;
}

/**
 * 处理所有命令
 * @param {object} ctx - 上下文对象
 * @param {string} command - 命令名称
 * @param {string[]} args - 命令参数
 */
async function handleCommand(ctx, command, args) {
    switch (command) {
        case 'timer':
            {
                const newInterval = validatePositiveInteger(args[1]);
                if (!newInterval) {
                    return ctx.reply('时间间隔必须是大于0的整数');
                }

                globalInterval = newInterval * 1000 * 60;

                ctx.reply(`Set timer for all enabled markets to ${newInterval} minutes`);

                clearTimeout(cycleSendMarketDataTimeout);
                cycleSendMarketData();
            }
            break;
        case 'list':
            {
                let listMessage = `*Current Markets*\n`;
                let index = 1;
                for (const [market, status] of Object.entries(markets)) {
                    const name = marketNames[market] || 'N/A';
                    listMessage += `${index}. ${market} (${name}) - ${status === null ? 'Enabled' : 'Disabled'}\n`;
                    index++;
                }
                ctx.reply(listMessage, { parse_mode: 'Markdown' });
            }
            break;
        case 'name':
            {
                const index = validatePositiveInteger(args[1].replace('#', ''));
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
            break;
        case 'add':
            {
                const marketSymbol = args[1];
                if (markets[marketSymbol] === undefined) {
                    markets[marketSymbol] = null;
                    writeConfig(); // 更新配置文件

                    ctx.reply(`Added market: ${marketSymbol}`);
                } else {
                    ctx.reply(`Market ${marketSymbol} already exists.`);
                }
            }
            break;
        case 'remove':
            {
                const index = validatePositiveInteger(args[1]);

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
            break;
        case 'enable':
            {
                const index = validatePositiveInteger(args[1]);

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
            break;
        case 'disable':
            {
                const index = validatePositiveInteger(args[1]);

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
            break;
        default:
            ctx.reply('Unknown command');
    }
}

// 创建通用命令处理器
function createCommandHandler(command) {
    return (ctx) => {
        const args = ctx.message.text.split(' ');
        commandQueue.push({ command, ctx, args });
        processCommandQueue();
    };
}

// 注册命令处理器
Object.keys(commandHandlers).forEach(command => {
    bot.command(command, createCommandHandler(command));
});

// 初始化市场数据和定时器
cycleSendMarketData();

// 运行 Bot
bot.launch();