import { BotContext } from '@/@types/scenes'
import { prisma } from '@/prisma/prisma.client'
import { backInlineKeyboard } from '@/keyboards/inline-keyboards/back.inline'

export const declineTicketAction = async (ctx: BotContext) => {
    try {
        // Извлекаем ID тикета из callback_data
        if (!ctx.match) {
            return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
        }
        
        const ticketId = Number(ctx.match[1])
        
        // Получаем информацию о тикете
        const ticket = await prisma.ticket.findFirst({
            where: {
                id: ticketId
            },
            include: {
                initiator: true,
                performer: true
            }
        })
        
        if (!ticket) {
            return ctx.answerCbQuery(
                'Тикет не найден.',
                { show_alert: true }
            )
        }
        
        // Проверяем права доступа (только администратор может отклонить тикет)
        const user = await prisma.user.findFirst({
            where: {
                id: ctx.from!.id.toString(),
                isAdmin: true
            }
        })
        
        if (!user) {
            return ctx.answerCbQuery(
                'У вас нет прав для выполнения этого действия.',
                { show_alert: true }
            )
        }
        
        // Обновляем статус тикета на DECLINE
        await prisma.ticket.update({
            where: {
                id: ticketId
            },
            data: {
                status: 'DECLINE',
                performer: {
                    connect: {
                        id: ctx.from!.id.toString()
                    }
                }
            }
        })
        
        // Отправляем уведомление пользователю
        await ctx.telegram.sendMessage(
            ticket.initiator.id,
            `<b>🔴 Тикет #${ticketId} был отклонен</b>\n\nК сожалению, ваш запрос был отклонен администрацией.`,
            {
                parse_mode: 'HTML'
            }
        )
        
        // Отвечаем администратору
        await ctx.answerCbQuery('Тикет успешно отклонен')
        
        return ctx.editMessageText(
            `<b>🔴 Тикет #${ticketId} был отклонен</b>\n\nВы отклонили запрос пользователя @${ticket.initiator.username}.`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [backInlineKeyboard('support-tickets')]
                }
            }
        )
    } catch (error) {
        console.error('[DECLINE_TICKET] Error:', error)
        return ctx.answerCbQuery('Произошла ошибка при отклонении тикета', { show_alert: true })
    }
} 