import {BotContext} from '@/@types/scenes'
import {backInlineKeyboard} from '@/keyboards/inline-keyboards/back.inline'
import {prisma} from '@/prisma/prisma.client'
import {getStatusColor, getTicketStatus} from '@/utils/get-ticket-status'
import {InlineKeyboardButton} from 'telegraf/typings/core/types/typegram'
import {QueryTriggers} from "@/constants/query-triggers";

export const supportTicketsAction = async (ctx: BotContext) => {
	const tickets = await prisma.ticket.findMany({
		where: {
			NOT: [
				{
					status: 'SUCCESS',
				},
			],
		},
		include: {
			initiator: true,
		},
	})
	const buttonsWithTicket: InlineKeyboardButton[][] = tickets!.map(ticket => [
		{
			callback_data: QueryTriggers.FULL_SUPPORT_TICKET(ticket.id),
			text: `От ${ticket.initiator.username} | ${getStatusColor(
				ticket.status
			)} ${getTicketStatus(ticket.status)}`,
		},
	])
	return ctx.editMessageText('Список актуальных запросов к поддержке:', {
		reply_markup: {
			inline_keyboard: [
				...buttonsWithTicket,
				backInlineKeyboard('support-panel'),
			],
		},
	})
}
