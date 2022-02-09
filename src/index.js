import { config } from 'dotenv';
config();

import { Telegraf, Context } from 'telegraf';
import { readFile } from 'node:fs/promises';
import fetch from 'node-fetch';

const bttvEmoteUrl = id => `https://cdn.betterttv.net/emote/${id}/3x`; 
const bttvSearchUrl = q => `https://api.betterttv.net/3/emotes/shared/search?query=${q}`; 
const tv7EmoteUrl = id => `https://cdn.7tv.app/emote/${id}/3x`;
const webpToGifUrl = url => `https://tools.vanawy.dev/webp2gif/?url=${url}`;

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const globalBttv = JSON.parse(
    await readFile(process.env.GLOBAL_EMOTES, {encoding: 'utf-8'})
);

bot.start((ctx) => ctx.reply('Welcome'));

bot.on('text', async ctx => {
    const result = await search(ctx.message.text);
    if (result.length == 0) return ctx.reply(":(");
    ctx.replyWithPhoto(bttvEmoteUrl(result[0].id));
});
bot.on('inline_query', async ctx => {
    const result = await search(ctx.inlineQuery.query);
    ctx.answerInlineQuery(createInlineResponse(result));
});
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

function normalizeQuery(query) {
    return query.toLowerCase().trim();
}

/**
 * Search for emote
 * @param string query 
 */
async function search(query, limit = 50)
{
    let result = [];
    query = normalizeQuery(query);
    console.log(`Searching for '${query}'...`);

    // let bttv = await searchBttv(query);
    let tv7 = await search7tv(query);
    for (let emote of [
        ...bttv, 
        ...tv7, 
        ...globalBttv
    ]) {
        if (emote.code.toLowerCase().indexOf(query) >= 0) {
            result.push(emote);
        }
        if (result.length >= limit) {
            break;
        }
    }
    console.log(`${result.length} results`);
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
                photo_url: bttvEmoteUrl(emote.id),
                thumb_url: bttvEmoteUrl(emote.id),
                title: emote.code,
            });
        } else if (emote.imageType == 'gif') {
            response.push({
                type: 'gif',
                id: emote.id,
                gif_url: bttvEmoteUrl(emote.id),
                thumb_url: bttvEmoteUrl(emote.id),
                title: emote.code,
            });
        } else if (emote.imageType == '7tv') {
            response.push({
                type: 'gif',
                id: emote.id,
                document_url: webpToGifUrl(emote.url),
                thumb_url: webpToGifUrl(emote.url),
                title: emote.code,
            });
        }
    }
    if (response.length == 0) {
        return [{
            type: 'article',
            id: '404',
            title: `No results for your query :(`,
            input_message_content: {
                message_text: 'oops :(',
            },
        }];
    }
    return response;
}

async function searchBttv(query) {
    if (query.length < 3) {
        return [];
    }
    return fetch(bttvSearchUrl(query)).then(res => res.json());
}

async function search7tv(query) {
    let json = await fetch("https://api.7tv.app/v2/gql", {
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:98.0) Gecko/20100101 Firefox/98.0",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.8,ru-RU;q=0.5,ru;q=0.3",
            "Content-Type": "application/json",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "Sec-GPC": "1",
        },
        "referrer": "https://7tv.app/",
        "body": `{\"query\":\"query($query: String!,$page: Int,$pageSize: Int,$globalState: String,$sortBy: String,$sortOrder: Int,$channel: String,$submitted_by: String,$filter: EmoteFilter) {search_emotes(query: $query,limit: $pageSize,page: $page,pageSize: $pageSize,globalState: $globalState,sortBy: $sortBy,sortOrder: $sortOrder,channel: $channel,submitted_by: $submitted_by,filter: $filter) {id,visibility,owner {id,display_name,role {id,name,color},banned}name,tags}}\",\"variables\":{\"query\":\"${query}\",\"page\":1,\"pageSize\":20,\"limit\":20,\"globalState\":null,\"sortBy\":\"popularity\",\"sortOrder\":0,\"channel\":null,\"submitted_by\":null}}`,
        "method": "POST",
        "mode": "cors"
    }).then(res => res.json());
    const response = json.data.search_emotes;
    return normalize7tvResponse(response);
}

function normalize7tvResponse(json)
{
    let result = [];
    for (let emote of json)
    {
        result.push({
            "id": emote.id,
            "code": emote.name,
            "imageType": "7tv",
            "userId": emote.owner.id,
            "url": tv7EmoteUrl(emote.id)
        });
    }
    return result;
}

