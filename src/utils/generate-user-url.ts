import { bot } from '@/config/bot'

export const generateUrlForUser = (userName: string) => {
	return new URL('https://t.me/' + bot.botInfo?.username + `?start=${userName}`)
}
