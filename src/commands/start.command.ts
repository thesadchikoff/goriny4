import {BotContext} from '@/@types/scenes'
import {BotConfig} from '@/config'
import adminNotifyModule from '@/core/admin/admin-notify.module'
import {generateUsername} from '@/utils/generate-username'
import {sendUserInfo} from '@/utils/send-user-info'
import {config} from '../config/service.config'
import {startInlineKeyboards} from '../keyboards/inline-keyboards/start-keyboard.inline'
import {prisma} from '../prisma/prisma.client'

export const startCommand = async (ctx: BotContext) => {
	try {
		Object.assign(
			{
				transfer: {
					recipientAddress: '',
				},
			},
			ctx.session
		)
		const args = ctx.text?.split(' ')

		if (args?.at(1) === 'support') {
			return ctx.scene.enter('support')
		}
		const username = args?.at(1)
		if (username && (username.startsWith('user') || username.startsWith('support'))) {
			return sendUserInfo(username, ctx)
		}
		if (ctx.scene) {
			await ctx.scene.leave()
		}
		const user = await prisma.user.findFirst({
			where: {
				id: ctx.chat!.id.toString(),
			},
		})
		if (!user) {
			const login = await generateUsername()
			const user = await prisma.user.create({
				data: {
					id: ctx.from!.id.toString(),
					username: ctx.from?.username ? ctx.from.username : 'unknown',
					login,
				},
			})
			await adminNotifyModule.sendNotify(
				config.messages.adminNotify({
					username: user.username,
					login: user.login!,
					id: user.id
				})
			)
		}

		await ctx.reply(
			BotConfig.App.WelcomeMessage.replace('%s', config.shopName),
			{
				parse_mode: 'HTML',
				reply_markup: {
					inline_keyboard: startInlineKeyboards,
				},
			}
		)
	} catch (error) {
		console.error(error)
	}
}
