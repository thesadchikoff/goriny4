import {BotContext} from "@/@types/scenes";
import adminNotifyModule from "@/core/admin/admin-notify.module";
import {bot} from "@/config/bot";
import userService from "@/db/user.service";

export const transactionNotifyForAdminAction = async (ctx: BotContext) => {
    try {
        const user = await userService.fetchOneById({
            id: ctx.from!.id
        });
        
        // Проверяем наличие данных перевода
        if (!(ctx.session as any).transfer || !(ctx.session as any).transfer.recipientAddress || !(ctx.session as any).countBTC) {
            console.error("Данные перевода отсутствуют:", {
                transfer: (ctx.session as any).transfer,
                countBTC: (ctx.session as any).countBTC
            });
            return ctx.reply("❌ Ошибка: данные перевода отсутствуют. Пожалуйста, начните процесс перевода заново.");
        }
        
        const recipientAddress = (ctx.session as any).transfer.recipientAddress;
        const countBTC = (ctx.session as any).countBTC;
        
        console.log("Отправка уведомления администратору:", {
            recipientAddress,
            countBTC
        });
        
        await bot.telegram.sendMessage(ctx.from!.id, '<b>Заявка на вывод отправлена модераторам</b>\n\nКак только модераторы примут решение, вы моментально получите уведомление', {
            parse_mode: 'HTML'
        });
        
        return adminNotifyModule.sendNotify(`<b>Попытка вывода средств</b>\n\nПользователь @${user!.username} хочет вывести <b>${countBTC} BTC</b> на кошелек <code>${recipientAddress}</code>`, [[
            {
                callback_data: 'confirm',
                text: '🟢 Одобрить'
            },
            {
                callback_data: 'reject',
                text: '🔴 Отклонить'
            }
        ]]);
    } catch (error: any) {
        console.error("Ошибка в transactionNotifyForAdminAction:", error);
        return ctx.reply(`❌ Произошла ошибка: ${error.message || "Неизвестная ошибка"}`);
    }
}