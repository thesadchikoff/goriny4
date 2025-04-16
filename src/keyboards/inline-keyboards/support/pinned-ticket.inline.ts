import {InlineKeyboardButton} from "telegraf/typings/core/types/typegram";
import {QueryTriggers} from "@/constants/query-triggers";

export const pinnedTicketInlineKeyboard = (ticketId: number): InlineKeyboardButton[][] => [
    [
        {
            callback_data: QueryTriggers.ANSWER_TICKET(ticketId),
            text: '✉️ Ответить пользователю'
        }
    ],
    [
        {
            callback_data: QueryTriggers.SUCCESS_TICKET(ticketId),
            text: '✅ Закрыть тикет'
        },
        {
            callback_data: QueryTriggers.DECLINE_TICKET(ticketId),
            text: "🚫 Отклонить"
        }
    ],
    [
        {
            callback_data: 'support-tickets',
            text: '🔙 К списку тикетов'
        }
    ]
]