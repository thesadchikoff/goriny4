import { prisma } from '@/prisma/prisma.client'
import { Scenes } from 'telegraf'
import { WizardContext } from 'telegraf/typings/scenes'

export const ChangeFee = new Scenes.WizardScene<WizardContext>(
	'change-fee',
	async ctx => {
		await ctx.reply(
			'Укажите % комиссии, который будет установлен на все транзакции пользователей'
		)
		return ctx.wizard.next()
	},
	async ctx => {
		try {
			const fee = parseFloat(ctx.text!)
			const config = await prisma.config.findFirst()
			await prisma.config.update({
				where: {
					id: config?.id,
				},
				data: {
					feeForTransaction: fee,
				},
			})
			await ctx.reply(
				`✅ <b>Комиссия успешна изменена!</b>\n\nВы установили комиссию ${fee}% за транзакции пользователей`,
				{ parse_mode: 'HTML' }
			)
			return ctx.scene.leave()
		} catch {
			ctx.reply('🚫 Что-то пошло не так, повторите попытку.')
			return ctx.scene.leave()
		}
	}
)
