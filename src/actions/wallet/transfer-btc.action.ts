import {BotContext} from "@/@types/scenes";
import userService from "@/db/user.service";
import {BotConfig} from "@/config";

export const transferBtcAction = async (ctx: BotContext) => {
    try {
        const user = await userService.fetchOneById({
            id: ctx.from!.id
        })
        if (user && user.isFreezeTransfer) {
            return ctx.answerCbQuery(BotConfig.App.BalanceFreezed, {
                show_alert: true
            })
        }
        if (user && user.wallet?.balance === 0) return ctx.answerCbQuery(BotConfig.App.BalanceIsZero, {
            show_alert: true
        })
        return ctx.scene.enter('transfer')
    } catch (error) {
        return ctx.reply(String(error))
    }
}