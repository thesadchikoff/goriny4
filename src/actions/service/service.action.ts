import {BotContext} from "@/@types/scenes";

export const serviceAction = (ctx: BotContext) => {
    return ctx.editMessageText('О сервисе', {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        callback_data: 'support',
                        text: '⎈ Поддержка'
                    }
                ]
            ]
        }
    })
}