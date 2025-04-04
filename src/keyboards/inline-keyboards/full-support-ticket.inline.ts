import {InlineKeyboardButton} from "telegraf/typings/core/types/typegram";
import {QueryTriggers} from "@/constants/query-triggers";

export const fullSupportTicketsInlineKeyboard = (ticketId: number): InlineKeyboardButton[][] => [
    [
        {
            callback_data: QueryTriggers.PINNED_TICKET(ticketId),
            text: '🕑 Взять в работу'
        },
        {
            callback_data: QueryTriggers.DECLINE_TICKET(ticketId),
            text: '🚫 Отклонить'
        }
    ]
]