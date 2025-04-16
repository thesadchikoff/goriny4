import { BotContext } from '@/@types/scenes'
import { prisma } from '@/prisma/prisma.client'
import { previousButton } from '@/keyboards/inline-keyboards/previous-button.inline'

export const deleteContactAddressAction = async (ctx: BotContext) => {
    try {
        // Проверяем, что у нас есть match с ID контакта
        if (!ctx.match) {
            return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
        }

        const itemId = Number(ctx.match[1])
        
        // Удаляем контакт
        const deletedContact = await prisma.addressBook.delete({
            where: {
                id: itemId,
            },
        })
        
        return ctx.editMessageText(
            `Контакт ${deletedContact.name} удален`, 
            {
                reply_markup: {
                    inline_keyboard: [previousButton('contacts_note')],
                },
            }
        )
    } catch (error) {
        console.error('[DELETE_CONTACT_ADDRESS] Error:', error)
        return ctx.answerCbQuery('Произошла ошибка при удалении контакта', { show_alert: true })
    }
} 