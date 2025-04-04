import { prisma } from '@/prisma/prisma.client'
import { Scenes } from 'telegraf'
import { WizardContext } from 'telegraf/typings/scenes'

export const ChooseAdminAddress = new Scenes.WizardScene<WizardContext>(
	'choose-admin-address',
	async ctx => {
		try {
			await ctx.reply('Укажите адрес кошелька администратора')
			return ctx.wizard.next()
		} catch (error) {
			console.error(error)
			await ctx.reply('🚫 Что-то пошл не так, повторите попытку')
			return ctx.scene.leave()
		}
	},
	async ctx => {
		try {
			const address = ctx.text!
			const config = await prisma.config.findFirst()
			await prisma.config.update({
				where: {
					id: config!.id,
				},
				data: {
					adminWalletAddress: address,
				},
			})
			await ctx.reply(
				`✅ Адрес кошелька администратора успешно изменен на <code>${address}</code>!`,
				{
					parse_mode: 'HTML',
				}
			)
			return ctx.scene.leave()
		} catch (error) {
			console.error(error)
			await ctx.reply('🚫 Что-то пошл не так, повторите попытку')
			return ctx.scene.leave()
		}
	}
)
