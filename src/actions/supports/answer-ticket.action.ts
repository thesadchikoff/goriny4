import { BotContext } from '@/@types/scenes'
import { prisma } from '@/prisma/prisma.client'

export const answerTicketAction = async (ctx: BotContext) => {
    try {
        // Извлекаем ID тикета из callback_data
        const ticketId = Number(ctx.match[1])
        
        // Проверяем существование тикета и права доступа
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
                'Вы не можете ответить на этот тикет. Возможно, он уже закрыт или вы не являетесь его исполнителем.',
                { show_alert: true }
            )
        }
        
        // Сохраняем ID тикета в сессии
        ctx.session.ticketId = ticketId
        
        // Запускаем сцену ответа на тикет
        await ctx.answerCbQuery()
        return ctx.scene.enter('answer-ticket')
    } catch (error) {
        console.error('[ANSWER_TICKET] Error:', error)
        return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
    }
}
