import { BotContext } from '@/@types/scenes'
import { prisma } from '@/prisma/prisma.client'
import { backInlineKeyboard } from '@/keyboards/inline-keyboards/back.inline'

export const successTicketAction = async (ctx: BotContext) => {
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
                },
                status: 'REVIEW'
            },
            include: {
                initiator: true,
                performer: true
            }
        })
        
        if (!ticket) {
            return ctx.answerCbQuery(
                'Тикет не найден или у вас нет прав для его закрытия.',
                { show_alert: true }
            )
        }
        
        // Обновляем статус тикета на SUCCESS
        await prisma.ticket.update({
            where: {
                id: ticketId
            },
            data: {
                status: 'SUCCESS'
            }
        })
        
        // Отправляем уведомление пользователю
        await ctx.telegram.sendMessage(
            ticket.initiator.id,
            `<b>🟢 Тикет #${ticketId} был успешно закрыт</b>\n\nВаш запрос в службу поддержки был успешно обработан. Спасибо за обращение!`,
            {
                parse_mode: 'HTML'
            }
        )
        
        // Отвечаем администратору
        await ctx.answerCbQuery('Тикет успешно закрыт')
        
        return ctx.editMessageText(
            `✅ <b>Тикет #${ticketId} был успешно закрыт</b>\n\nВопрос пользователя @${ticket.initiator.username} решен.`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [backInlineKeyboard('support-tickets')]
                }
            }
        )
    } catch (error) {
        console.error('[SUCCESS_TICKET] Error:', error)
        return ctx.answerCbQuery('Произошла ошибка при закрытии тикета', { show_alert: true })
    }
} 