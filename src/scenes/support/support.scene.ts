import {BotContext} from '@/@types/scenes'
import adminNotifyModule from '@/core/admin/admin-notify.module'
import {prisma} from '@/prisma/prisma.client'
import {getTicketStatus} from '@/utils/get-ticket-status'
import {Scenes} from 'telegraf'
import {WizardContext} from 'telegraf/typings/scenes'

const sendAnswer = async (ctx: BotContext) => {
	ctx.session.support = {}
	await ctx.reply('<b>Поддержка</b>\n\nНапишите Ваш вопрос для саппортов', {
		parse_mode: 'HTML',
	})
	return ctx.wizard.next()
}

const successAnswer = async (ctx: BotContext) => {
	ctx.session.support!.message = ctx.text
	const ticket = await prisma.ticket.create({
		data: {
			initiatorId: ctx.from!.id!.toString(),
			ticketMessage: ctx.session.support!.message!,
		},
		include: {
			initiator: true,
		},
	})
	adminNotifyModule.sendNotify(
		`<b>Новый запрос в поддержку #${ticket.id}</b>\n\nПользователь @${ticket.initiator.username} <b>[ID: ${ticket.initiator.id}]</b> обратился за помощью\n\n<b>Содержание запроса:</b>\n${ticket.ticketMessage}`
	)
	await ctx.reply(
		`<b>Поддержка</b>\n\nВаш запрос #${
			ticket.id
		} отправлен в поддержку, ожидайте, когда с вами свяжутся\n\nСтатус: ${getTicketStatus(
			ticket.status
		)}`,
		{
			parse_mode: 'HTML',
		}
	)
	ctx.session.support = {}
	return ctx.scene.leave()
}

export const SupportScene = new Scenes.WizardScene<WizardContext>(
	'support',
	sendAnswer,
	successAnswer
)
