import { BotContext } from '@/@types/scenes'
import { backInlineKeyboard } from '@/keyboards/inline-keyboards/back.inline'
import { fullSupportTicketsInlineKeyboard } from '@/keyboards/inline-keyboards/full-support-ticket.inline'
import { prisma } from '@/prisma/prisma.client'
import { timeFormat } from '@/utils/time-format'

export const fullSupportTicketAction = async (ctx: BotContext) => {
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

	const actionButtons = [...fullSupportTicketsInlineKeyboard(ticketId)]

	const isActionButtonsView = ticket.status !== 'REVIEW' ? actionButtons : []

	return ctx.editMessageText(
		`Запрос #${ticket.id} от @${
			ticket.initiator.username
		}\n\n<b>Содержание запроса:</b>\n${
			ticket.ticketMessage
		}\n\nСоздан: ${timeFormat(ticket.createdAt)}\n\n<b>${performerTo}</b>`,
		{
			parse_mode: 'HTML',
			reply_markup: {
				inline_keyboard: [
					...isActionButtonsView,
					backInlineKeyboard('support-tickets'),
				],
			},
		}
	)
}
