import { BotContext } from '@/@types/scenes'
import { prisma } from '@/prisma/prisma.client'
import adminNotifyModule from '@/core/admin/admin-notify.module'
import { Scenes } from 'telegraf'

// Создаем сцену для ответа на тикет
export const replyToSupportScene = new Scenes.WizardScene<BotContext>(
	'reply-to-support',
	// Шаг 1: Получаем информацию о тикете и запрашиваем ответ
	async (ctx) => {
		try {
			// Проверяем, что у нас есть id тикета в данных сессии
			const ticketId = ctx.session?.ticketReply?.ticketId
			
			if (!ticketId) {
				await ctx.reply('❌ Ошибка: ID тикета не найден')
				return ctx.wizard.selectStep(1) // Переходим к последнему шагу для выхода
			}

			// Получаем информацию о тикете
			const ticket = await prisma.ticket.findFirst({
				where: { id: ticketId },
				include: {
					initiator: true,
					performer: true
				}
			})
			
			if (!ticket) {
				await ctx.reply('❌ Тикет не найден')
				return ctx.wizard.selectStep(1) // Переходим к последнему шагу для выхода
			}
			
			// Проверяем, что пользователь является инициатором тикета
			if (ticket.initiatorId !== ctx.from!.id.toString()) {
				await ctx.reply('❌ Вы не можете отвечать на этот тикет')
				return ctx.wizard.selectStep(1) // Переходим к последнему шагу для выхода
			}
			
			await ctx.reply(
				`<b>💬 Ответ в службу поддержки</b>\n\n`+
				`Тикет #${ticket.id}\n`+
				`<b>Содержание вашего запроса:</b>\n${ticket.ticketMessage}\n\n`+
				`Напишите ваш ответ:`,
				{
					parse_mode: 'HTML'
				}
			)
			
			return ctx.wizard.next()
		} catch (error) {
			console.error('[REPLY_TO_SUPPORT] Error in step 1:', error)
			await ctx.reply('❌ Произошла ошибка при обработке запроса')
			return ctx.wizard.selectStep(1) // Переходим к последнему шагу для выхода
		}
	},
	
	// Шаг 2: Обрабатываем ответ пользователя
	async (ctx) => {
		try {
			// Проверяем наличие текстового сообщения
			if (!ctx.message || !('text' in ctx.message)) {
				await ctx.reply('❌ Пожалуйста, отправьте текстовое сообщение')
				return
			}
			
			const replyText = ctx.message.text
			const ticketId = ctx.session?.ticketReply?.ticketId
			
			if (!ticketId) {
				await ctx.reply('❌ Ошибка: ID тикета не найден')
				return ctx.wizard.selectStep(1) // Переходим к последнему шагу для выхода
			}
			
			// Получаем информацию о тикете
			const ticket = await prisma.ticket.findFirst({
				where: { id: ticketId },
				include: {
					initiator: true,
					performer: true
				}
			})
			
			if (!ticket) {
				await ctx.reply('❌ Тикет не найден')
				return ctx.wizard.selectStep(1) // Переходим к последнему шагу для выхода
			}
			
			// Записываем ответ в историю тикета
			await prisma.ticketMessage.create({
				data: {
					ticketId: ticket.id,
					senderId: ctx.from!.id.toString(),
					message: replyText,
					isFromSupport: false
				}
			})
			
			// Отправляем уведомление администратору
			if (ticket.performerId) {
				await ctx.telegram.sendMessage(
					ticket.performerId,
					`<b>📩 Новый ответ от пользователя по тикету #${ticket.id}</b>\n\n`+
					`От: @${ticket.initiator.username}\n\n`+
					`<b>Сообщение:</b>\n${replyText}`,
					{
						parse_mode: 'HTML',
						reply_markup: {
							inline_keyboard: [
								[
									{
										callback_data: `answer-ticket-${ticket.id}`,
										text: '💬 Ответить'
									}
								]
							]
						}
					}
				)
			} else {
				// Отправляем уведомление всем администраторам
				adminNotifyModule.sendNotify(
					`<b>📩 Новый ответ от пользователя по тикету #${ticket.id}</b>\n\n`+
					`От: @${ticket.initiator.username} <b>[ID: ${ticket.initiator.id}]</b>\n\n`+
					`<b>Сообщение:</b>\n${replyText}`
				)
			}
			
			await ctx.reply(
				`✅ Ваш ответ успешно отправлен в службу поддержки\n\n`+
				`Мы обработаем его в ближайшее время`
			)
			
			// Очищаем данные тикета и завершаем
			if (ctx.session?.ticketReply) {
				delete ctx.session.ticketReply
			}
			
			return ctx.scene.leave()
		} catch (error) {
			console.error('[REPLY_TO_SUPPORT] Error in step 2:', error)
			await ctx.reply('❌ Произошла ошибка при обработке запроса')
			return ctx.scene.leave()
		}
	}
)

// Обработчик команды отмены
replyToSupportScene.command('cancel', async (ctx) => {
	try {
		if (ctx.session?.ticketReply) {
			delete ctx.session.ticketReply
		}
		await ctx.reply('❌ Отправка ответа отменена')
		return ctx.scene.leave()
	} catch (error) {
		console.error('[REPLY_TO_SUPPORT] Error in cancel command:', error)
		await ctx.reply('❌ Произошла ошибка при отмене')
		return ctx.scene.leave()
	}
}) 