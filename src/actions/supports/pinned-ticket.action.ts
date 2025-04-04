import {BotContext} from "@/@types/scenes";
import {prisma} from "@/prisma/prisma.client";
import {bot} from "@/config/bot";
import {pinnedTicketInlineKeyboard} from "@/keyboards/inline-keyboards/support/pinned-ticket.inline";

export const pinnedTicketAction = async (ctx: BotContext) => {
    const ticketId = Number(ctx.match[1])
    const ticket = await prisma.ticket.update({
        where: {
            id: ticketId
        },
        data: {
            performer: {
                connect: {
                    id: ctx.from!.id.toString()
                }
            },
            status: 'REVIEW'
        },
        include: {
            performer: true,
            initiator: true,
        }
    })

    await bot.telegram.sendMessage(ticket.initiator.id, `<b>Ответ поддержки</b>\n\nАдминистратор начал работу над вашим запросом!\nОжидайте ответа в ближайшее время.`, {
        parse_mode: 'HTML'
    })
    return ctx.editMessageText(`Вы взяли в работу тикет <b>#${ticket.id}</b>\n\nВ качестве исполнителя тикета назначены вы.`, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: pinnedTicketInlineKeyboard(ticketId),
        }
    })
}