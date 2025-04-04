import {InlineKeyboardButton} from "telegraf/typings/core/types/typegram";

export const checkBalanceInline: InlineKeyboardButton[][] = [
    [
        {
            callback_data: 'check-balance',
            text: '⎋ Обновить',
        },
        {
            callback_data: 'support',
            text: '⎈ Поддержка'
        }
    ]
]