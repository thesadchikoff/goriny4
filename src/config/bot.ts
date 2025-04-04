import 'dotenv/config'
import {Telegraf} from 'telegraf'
import {BotContext} from "@/@types/scenes";

export const bot = new Telegraf<BotContext>(
	process.env.TG_TOKEN as string
)

