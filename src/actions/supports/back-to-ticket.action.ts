import { BotContext } from '@/@types/scenes'
import { prisma } from '@/prisma/prisma.client'
import { pinnedTicketInlineKeyboard } from '@/keyboards/inline-keyboards/support/pinned-ticket.inline'
import { timeFormat } from '@/utils/time-format'

export const backToTicketAction = async (ctx: BotContext) => {
    try {
        // Извлекаем ID тикета из callback_data
        if (!ctx.match) {
            return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
        }
        
        const ticketId = Number(ctx.match[1])
        
        // Получаем информацию о тикете
        const ticket = await prisma.ticket.findFirst({
            where: {
                id: ticketId,
                performer: {
                    id: ctx.from!.id.toString()
                }
            },
            include: {
                initiator: true,
                performer: true
            }
        })
        
        if (!ticket) {
            return ctx.answerCbQuery(
                'Тикет не найден или у вас нет к нему доступа.',
                { show_alert: true }
            )
        }
        
        // Возвращаемся к тикету
        await ctx.answerCbQuery()
        
        // Формируем клавиатуру в зависимости от статуса тикета
        let keyboard;
        if (ticket.status === 'REVIEW') {
            // Для тикетов на рассмотрении показываем кнопки ответа и закрытия
            keyboard = pinnedTicketInlineKeyboard(ticketId);
        } else {
            // Для других статусов показываем только кнопку возврата к списку
            keyboard = [
                [
                    {
                        callback_data: 'support-tickets',
                        text: '🔙 К списку тикетов'
                    }
                ]
            ];
        }
        
        return ctx.editMessageText(
            `<b>Тикет #${ticket.id} от @${ticket.initiator.username}</b>\n\n` +
            `<b>Содержание запроса:</b>\n${ticket.ticketMessage}\n\n` +
            `Статус: ${ticket.status === 'REVIEW' ? '🔵 На рассмотрении' : 
                     ticket.status === 'SUCCESS' ? '🟢 Исполнен' : 
                     ticket.status === 'DECLINE' ? '🔴 Отклонен' : '🟡 В ожидании'}\n` +
            `Создан: ${timeFormat(ticket.createdAt)}\n\n` +
            `<b>В качестве исполнителя назначены вы.</b>`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: keyboard
                }
            }
        )
    } catch (error) {
        console.error('[BACK_TO_TICKET] Error:', error)
        return ctx.answerCbQuery('Произошла ошибка при возврате к тикету', { show_alert: true })
    }
} 