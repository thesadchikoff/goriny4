import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { QueryTriggers } from "@/constants/query-triggers";

export const closeTicketInlineKeyboard = (ticketId: number): InlineKeyboardButton[][] => [
    [
        {
            callback_data: QueryTriggers.SUCCESS_TICKET(ticketId),
            text: '✅ Закрыть тикет'
        },
        {
            callback_data: QueryTriggers.BACK_TO_TICKET(ticketId),
            text: "🔙 Вернуться к тикету"
        }
    ]
] 