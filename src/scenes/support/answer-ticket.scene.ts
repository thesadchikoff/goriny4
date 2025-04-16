import { BotContext } from '@/@types/scenes'
import { prisma } from '@/prisma/prisma.client'
import { getTicketStatus } from '@/utils/get-ticket-status'
import { Scenes } from 'telegraf'
import { pinnedTicketInlineKeyboard } from '@/keyboards/inline-keyboards/support/pinned-ticket.inline'
import { closeTicketInlineKeyboard } from '@/keyboards/inline-keyboards/support/close-ticket.inline'
import { QueryTriggers } from '@/constants/query-triggers'

// Функция для инициализации сцены и запроса ответа
const sendAnswer = async (ctx: BotContext) => {
	// Получаем ID тикета из сессии
	const ticketId = ctx.session.ticketId
	
	if (!ticketId) {
		await ctx.reply('❌ Ошибка: ID тикета не найден')
		return ctx.scene.leave()
	}
	
	// Получаем информацию о тикете
	const ticket = await prisma.ticket.findFirst({
		where: { id: ticketId },
		include: {
			initiator: true,
			performer: true,
		},
	})
	
	if (!ticket) {
		await ctx.reply('❌ Тикет не найден')
		return ctx.scene.leave()
	}
	
	// Проверяем что текущий пользователь является исполнителем тикета
	if (ticket.performerId !== ctx.from!.id.toString()) {
		await ctx.reply('❌ Вы не являетесь исполнителем этого тикета')
		return ctx.scene.leave()
	}
	
	await ctx.reply(
		`<b>💬 Ответ пользователю @${ticket.initiator.username}</b>\n\n`+
		`Тикет #${ticket.id}\n`+
		`<b>Содержание запроса:</b>\n${ticket.ticketMessage}\n\n`+
		`Напишите ваш ответ на запрос:`,
		{
			parse_mode: 'HTML',
		}
	)
	
	return ctx.wizard.next()
}

// Функция для обработки ответа администратора
const processAnswer = async (ctx: BotContext) => {
	// Получаем текст ответа
	const answerText = ctx.message.text
	
	// Получаем ID тикета из сессии
	const ticketId = ctx.session.ticketId
	
	if (!ticketId) {
		await ctx.reply('❌ Ошибка: ID тикета не найден')
		return ctx.scene.leave()
	}
	
	// Получаем информацию о тикете
	const ticket = await prisma.ticket.findFirst({
		where: { id: ticketId },
		include: {
			initiator: true,
			performer: true,
		},
	})
	
	if (!ticket) {
		await ctx.reply('❌ Тикет не найден')
		return ctx.scene.leave()
	}
	
	// Отправляем ответ пользователю
	await ctx.telegram.sendMessage(
		ticket.initiator.id,
		`<b>📩 Ответ от службы поддержки по тикету #${ticket.id}</b>\n\n${answerText}`,
		{
			parse_mode: 'HTML',
			reply_markup: {
				inline_keyboard: [
					[
						{
							callback_data: QueryTriggers.REPLY_TICKET(ticket.id),
							text: '💬 Ответить'
						}
					]
				]
			}
		}
	)
	
	// Сообщаем администратору об успешной отправке
	await ctx.reply(
		`✅ Ваш ответ успешно отправлен пользователю @${ticket.initiator.username}`,
		{
			reply_markup: {
				inline_keyboard: closeTicketInlineKeyboard(ticketId)
			}
		}
	)
	
	// Очищаем сессию и завершаем сцену
	delete ctx.session.ticketId
	return ctx.scene.leave()
}

// Создаем сцену для ответа на тикет
export const answerTicketScene = new Scenes.WizardScene<BotContext>(
	'answer-ticket',
	sendAnswer,
	processAnswer
)

// Устанавливаем обработчик для отмены
answerTicketScene.command('cancel', async (ctx) => {
	delete ctx.session.ticketId
	await ctx.reply('❌ Отправка ответа отменена')
	return ctx.scene.leave()
}) 