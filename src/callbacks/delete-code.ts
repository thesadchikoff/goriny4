import { Context } from 'telegraf'
import { prisma } from '../prisma/prisma.client'

export const deleteCode = async (ctx: any) => {
	try {
		const codeId = parseInt(ctx.match![1])
		
		await prisma.code.delete({
			where: {
				id: codeId
			}
		})

		await ctx.answerCbQuery('✅ Промокод успешно удален')
		
		// Возвращаемся к списку промокодов
		const codes = await prisma.code.findMany({
			where: {
				creatorId: ctx.from?.id.toString()
			}
		})

		if (codes.length > 0) {
			let codeStroke = ''
			const buttons = codes.map((code, index) => [
				{
					text: `❌ Удалить ${code.code}`,
					callback_data: `delete_code_${code.id}`
				}
			])
			
			codes.forEach((code, index) => {
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
					inline_keyboard: [
						[
							{
								callback_data: 'promo',
								text: '◀️ Назад',
							},
						],
					],
				},
			})
		}
	} catch (error) {
		console.log(error)
		await ctx.answerCbQuery('❌ Произошла ошибка при удалении промокода')
	}
} 