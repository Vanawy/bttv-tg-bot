import fetch from 'node-fetch';
import { writeFile } from 'node:fs/promises'; 
import { config } from 'dotenv';
config();

const GLOBAL_EMOTES_URL = 'https://api.betterttv.net/3/cached/emotes/global';

fetch(GLOBAL_EMOTES_URL)
.then(res => res.json())
.then(json => writeFile(process.env.GLOBAL_EMOTES, JSON.stringify(json)));