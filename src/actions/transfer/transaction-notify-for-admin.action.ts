import {BotContext} from "@/@types/scenes";
import adminNotifyModule from "@/core/admin/admin-notify.module";
import {bot} from "@/config/bot";
import userService from "@/db/user.service";

export const transactionNotifyForAdminAction = async (ctx: BotContext) => {
    const user = await userService.fetchOneById({
        id: ctx.from!.id
    })
    const recipientAddress = ctx.session.transfer?.recipientAddress
    const countBTC = ctx.session.transfer?.countBTC
    await bot.telegram.sendMessage(ctx.from!.id, '<b>Заявка на вывод отправлена модераторам</b>\n\nКак только модераторы примут решение, вы моментально получите уведомление', {
        parse_mode: 'HTML'
    })
    return adminNotifyModule.sendNotify(`<b>Попытка вывода средств</b>\n\nПользователь @${user!.username} хочет вывести <b>${countBTC} BTC</b> на кошелек <code>${recipientAddress}</code>`, [[
        {
            callback_data: 'confirm',
            text: '🟢 Одобрить'
        },
        {
            callback_data: 'reject',
            text: '🔴 Отклонить'
        }
    ]])
}