import {BotContext} from "@/@types/scenes";
import {prisma} from "@/prisma/prisma.client";
import {InlineKeyboardButton} from "telegraf/typings/core/types/typegram";
import {previousButton} from "@/keyboards/inline-keyboards/previous-button.inline";

export const contactsNoteAction = async (ctx: BotContext) => {
    const contacts = await prisma.addressBook.findMany({
        where: {
            userId: ctx.from?.id.toString(),
        },
    })
    const contactsButtons: InlineKeyboardButton[] = []
    contacts.forEach(contact => {
        contactsButtons.push({
            callback_data: `address-contact-${contact.id}`,
            text: contact.name,
        })
    })
    return ctx.editMessageText('📃 Адресная книга для BTC', {
        reply_markup: {
            inline_keyboard: [
                contactsButtons,
                [
                    { callback_data: 'create-address', text: 'Создать' },
                    ...previousButton('wallet'),
                ],
            ],
        },
    })
}