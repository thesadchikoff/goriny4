import { BotContext } from '@/@types/scenes'
import { prisma } from '@/prisma/prisma.client'
import adminNotifyModule from '@/core/admin/admin-notify.module'

export const replyTicketAction = async (ctx: BotContext) => {
    try {
        // Извлекаем ID тикета из callback_data
        if (!ctx.match) {
            return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
        }
        
        const ticketId = Number(ctx.match[1])
        
        // Проверяем существование тикета
        const ticket = await prisma.ticket.findFirst({
            where: {
                id: ticketId,
                initiator: {
                    id: ctx.from!.id.toString()
                },
                status: 'REVIEW',
                performer: {
                    isNot: null
                }
            },
            include: {
                initiator: true,
                performer: true
            }
        })
        
        if (!ticket) {
            return ctx.answerCbQuery(
                'Вы не можете ответить на этот тикет. Возможно, он уже закрыт или обработан другим администратором.',
                { show_alert: true }
            )
        }
        
        // Запускаем сцену ответа пользователя
        await ctx.answerCbQuery()
        ctx.session.ticketReply = {
            ticketId: ticketId
        }
        
        // Запускаем сцену для ответа
        return ctx.scene.enter('reply-to-support')
    } catch (error) {
        console.error('[REPLY_TICKET] Error:', error)
        return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
    }
} 