import {BotContext} from "@/@types/scenes";
import userService from "@/db/user.service";
import {MiddlewareFn} from "telegraf";

export const checkBlockMiddleware: MiddlewareFn<BotContext> = async (ctx, next: () => Promise<void>) => {
    const user = await userService.fetchOneById({
        id: ctx.from!.id
    })
    if (user?.isBlocked) {
        // Если пользователь заблокирован, отправляем уведомление и прекращаем выполнение
        return ctx.reply("🔴 Вы заблокированы и не можете пользоваться ботом.", {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            url: 'https://t.me/@nevermoon',
                            text: '⎋ Связаться с администратором'
                        }
                    ]
                ]
            }
        });
    }

    return next();
}