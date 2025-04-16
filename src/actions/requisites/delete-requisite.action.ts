import { BotContext } from '@/@types/scenes'
import { prisma } from '@/prisma/prisma.client'
import { previousButton } from '@/keyboards/inline-keyboards/previous-button.inline'

export const deleteRequisiteAction = async (ctx: BotContext) => {
    try {
        // Проверяем, что у нас есть match с ID реквизита
        if (!ctx.match) {
            return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
        }

        const itemId = Number(ctx.match[1])
        
        // Удаляем реквизит
        await prisma.requisite.delete({
            where: {
                id: itemId,
            },
        })
        
        return ctx.editMessageText(
            `Реквизиты удалены.`, 
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [previousButton('requisites')],
                },
            }
        )
    } catch (error) {
        console.error('[DELETE_REQUISITE] Error:', error)
        return ctx.answerCbQuery('Произошла ошибка при удалении реквизитов', { show_alert: true })
    }
} 