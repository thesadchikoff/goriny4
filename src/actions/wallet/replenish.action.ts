import {BotContext} from '@/@types/scenes'
import {prisma} from '@/prisma/prisma.client'

export const replenishAction = async (ctx: BotContext) => {
	try {
		const userWallet = await prisma.user.findFirst({
			where: {
				id: ctx.from!.id.toString(),
			},
			include: {
				wallet: true,
			},
		})
		return ctx.editMessageText(
			`❗️Минимальная сумма пополнения Bitcoin: <b>0.0010 BTC</b>.\n\nЕсли вы решите пополнить меньше <b>0.0010 BTC</b>, то они не будут зачислены на ваш баланс.\n\nАдрес вашего кошелька: <code>${userWallet?.wallet?.address}</code>`,
			{
				parse_mode: 'HTML',
				reply_markup: {
					inline_keyboard: [
						[
							{
								callback_data: 'check-balance',
								text: '✅ Я пополнил'
							},
							{
								callback_data: 'wallet',
								text: '↩︎ Назад',
							},
						],
					],
				},
			}
		)
	} catch (error) {
		return ctx.reply(String(error))
	}
}
