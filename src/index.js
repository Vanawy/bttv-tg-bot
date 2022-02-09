import { config } from 'dotenv';
config();

import { Telegraf, Context } from 'telegraf';
import { readFile } from 'node:fs/promises';
import fetch from 'node-fetch';

const emoteImageUrl = id => `https://cdn.betterttv.net/emote/${id}/3x`; 

const customeEmotesSearchUrl = q => `https://api.betterttv.net/3/emotes/shared/search?query=${q}`; 

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const emotes = JSON.parse(
    await readFile(process.env.GLOBAL_EMOTES, {encoding: 'utf-8'})
);
// console.log(emotes);

bot.start((ctx) => ctx.reply('Welcome'));
bot.help((ctx) => ctx.reply('Send me a sticker'));
bot.on('sticker', (ctx) => ctx.reply('👍'));
bot.hears('hi', (ctx) => ctx.reply('Hey there'));

bot.on('text', async ctx => {
    const result = await search(ctx.message.text);
    if (result.length == 0) return ctx.reply(":(");
    ctx.replyWithPhoto(emoteImageUrl(result[0].id));
});
bot.on('inline_query', async ctx => {
    const result = await search(ctx.inlineQuery.query);
    ctx.answerInlineQuery(createInlineResponse(result));
})
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));


/**
 * Search for emote
 * @param string query 
 */
async function search(query, limit = 50)
{
    let result = [];
    query = query.toLowerCase().trim();
    console.log(`Searching for '${query}'...`);
    let custom = [];
    if (query.length > 3) {
        custom = await getCustomEmotes(query);
    }
    console.log(custom);
    for (let emote of [...emotes, ...custom]) {
        if (emote.code.toLowerCase().indexOf(query) >= 0) {
            result.push(emote);
        }
        if (result.length >= limit) {
            break;
        }
    }
    return result;
}

function createInlineResponse(results)
{
    let response = [];
    for (let emote of results) {
        if (emote.imageType == 'png') {
            response.push({
                type: 'photo',
                id: emote.id,
                photo_url: emoteImageUrl(emote.id),
                thumb_url: emoteImageUrl(emote.id),
                title: emote.code,
            });
        } else if (emote.imageType == 'gif') {
            response.push({
                type: 'gif',
                id: emote.id,
                gif_url: emoteImageUrl(emote.id),
                thumb_url: emoteImageUrl(emote.id),
                title: emote.code,
            });
        }
    }
    // console.log(response);
    return response;
}

async function getCustomEmotes(query) {
    return fetch(customeEmotesSearchUrl(query)).then(res => res.json());
}

