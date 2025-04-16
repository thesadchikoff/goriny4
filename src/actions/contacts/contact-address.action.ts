import { BotContext } from '@/@types/scenes'
import { prisma } from '@/prisma/prisma.client'
import { previousButton } from '@/keyboards/inline-keyboards/previous-button.inline'

export const contactAddressAction = async (ctx: BotContext) => {
    try {
        // Проверяем, что у нас есть match с ID контакта
        if (!ctx.match) {
            return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
        }

        const itemId = Number(ctx.match[1])
        
        // Получаем информацию о контакте
        const contact = await prisma.addressBook.findFirst({
            where: {
                id: itemId,
            },
        })
        
        if (!contact) {
            return ctx.answerCbQuery('Контакт не найден', { show_alert: true })
        }
        
        return ctx.editMessageText(
            `<b>Название адреса:</b> ${contact.name}\n\n<b>Монета:</b> BTC\n<b>Адрес:</b> <code>${contact.address}</code>`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                callback_data: `delete-contact-${contact.id}`,
                                text: 'Удалить',
                            },
                        ],
                        previousButton('contacts_note'),
                    ],
                },
            }
        )
    } catch (error) {
        console.error('[CONTACT_ADDRESS] Error:', error)
        return ctx.answerCbQuery('Произошла ошибка при обработке запроса', { show_alert: true })
    }
} 