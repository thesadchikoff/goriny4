import {InlineKeyboardButton} from "telegraf/typings/core/types/typegram";
import {QueryTriggers} from "@/constants/query-triggers";

export const pinnedTicketInlineKeyboard = (ticketId: number): InlineKeyboardButton[][] => [
    [
        {
            callback_data: `answer-ticket-${ticketId}`,
            text: '✉️ Ответить пользователю'
        },
        {
            callback_data: QueryTriggers.DECLINE_TICKET(ticketId),
            text: "🚫 Отклонить"
        }
    ]
]