import { BotContext } from '@/@types/scenes'
import { backInlineKeyboard } from '@/keyboards/inline-keyboards/back.inline'
import { fullSupportTicketsInlineKeyboard } from '@/keyboards/inline-keyboards/full-support-ticket.inline'
import { pinnedTicketInlineKeyboard } from '@/keyboards/inline-keyboards/support/pinned-ticket.inline'
import { prisma } from '@/prisma/prisma.client'
import { timeFormat } from '@/utils/time-format'

export const fullSupportTicketAction = async (ctx: BotContext) => {
	if (!ctx.match) {
		return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
	}
	
	const ticketId = Number(ctx.match[1])
	const ticket = await prisma.ticket.findFirst({
		where: {
			id: ticketId,
		},
		include: {
			initiator: true,
			performer: true,
		},
	})
	if (!ticket) {
		return ctx.editMessageText(
			`😔 Запрос в поддержку не найден, возможно его уже закрыли.`,
			{
				reply_markup: {
					inline_keyboard: [backInlineKeyboard('support-tickets')],
				},
			}
		)
	}

	const performerTo =
		ticket.performer && `На рассмотрении у @${ticket.performer.username}`

	// Определяем, какие кнопки отображать в зависимости от статуса тикета и исполнителя
	let actionButtons = [];
	
	// Для админа, который назначен исполнителем тикета в статусе REVIEW
	if (ticket.status === 'REVIEW' && ticket.performer && ticket.performer.id === ctx.from!.id.toString()) {
		// Показываем кнопки действий для исполнителя (ответ, закрытие, отклонение)
		actionButtons = pinnedTicketInlineKeyboard(ticketId);
	} 
	// Для тикетов в статусе PENDING, которые еще не взяты в работу, показываем стандартные кнопки
	else if (ticket.status === 'PENDING') {
		actionButtons = fullSupportTicketsInlineKeyboard(ticketId);
	}
	// Для других случаев просто добавляем кнопку возврата к списку тикетов
	else {
		actionButtons = [[
			{
				callback_data: 'support-tickets',
				text: '🔙 К списку тикетов'
			}
		]];
	}

	return ctx.editMessageText(
		`Запрос #${ticket.id} от @${
			ticket.initiator.username
		}\n\n<b>Содержание запроса:</b>\n${
			ticket.ticketMessage
		}\n\nСоздан: ${timeFormat(ticket.createdAt)}\n\n${performerTo ? `<b>${performerTo}</b>` : ''}`,
		{
			parse_mode: 'HTML',
			reply_markup: {
				inline_keyboard: actionButtons
			},
		}
	)
}
