import { previousButton } from '../keyboards/inline-keyboards/previous-button.inline'
import { prisma } from '../prisma/prisma.client'

export const myCodes = async (ctx: any) => {
	await prisma.code
		.findMany({
			where: {
				creatorId: ctx.from?.id.toString(),
			},
		})
		.then(response => {
			if (response.length > 0) {
				let codeStroke = ''
				const buttons = response.map((code, index) => [
					{
						text: `❌ Удалить ${code.code}`,
						callback_data: `delete_code_${code.id}`
					}
				])
				
				response.forEach((code, index) => {
					codeStroke += `<b>${++index}.</b> <code>${code.code}</code> | ${code.amountCoins} BTC\n`
				})

				buttons.push([{
					text: '◀️ Назад',
					callback_data: 'promo'
				}])

				return ctx.editMessageText(
					`🎫 <b>Список активных кодов</b>\n\n${codeStroke}\n\nВыберите промокод для удаления:`,
					{
						parse_mode: 'HTML',
						reply_markup: {
							inline_keyboard: buttons,
						},
					}
				)
			} else {
				return ctx.editMessageText(`🎫 Список активных кодов пуст`, {
					parse_mode: 'HTML',
					reply_markup: {
						inline_keyboard: [previousButton('promo')],
					},
				})
			}
		})
}
