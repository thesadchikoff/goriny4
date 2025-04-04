import {BotContext} from "@/@types/scenes";
import userService from "@/db/user.service";
import {checkBalanceInline} from "@/keyboards/inline-keyboards/check-balance.inline";
import { getBitcoinBalance, BitcoinNetwork, BalanceApiType } from "@/trust-wallet/bitcoin-balance";


export const checkBalance = async (ctx: BotContext) => {
    if (ctx.scene) {
        await ctx.scene.leave()
    }
    
    const user = await userService.fetchOneById({
        id: ctx.from!.id
    })

    if (!user?.wallet) return
    const cryptoBalance = await getBitcoinBalance(user?.wallet!.address, BitcoinNetwork.MAINNET, BalanceApiType.BLOCKCHAIN_INFO)
    if (!cryptoBalance || cryptoBalance.error) return
    
    if (cryptoBalance.balanceSatoshi > user.wallet.balance! * 100000000) {
        const changeBalance = await userService.changeUserBalance({
            params: {
                id: user.id,
            },
            value: user.wallet.balance + cryptoBalance.balance
        })
        return ctx.reply(!changeBalance ? "Произошла ошибка при пополнении баланса" : `✅ Баланс успешно пополнен на сумму <code>${cryptoBalance.balance} BTC</code>\n\n<b>Прежний баланс:</b> <code>${user.wallet.balance} BTC</code>\n<b>Текущий баланс:</b> <code>${changeBalance.currentBalance} BTC</code>`, {
            parse_mode: "HTML"
        })
    }
    return ctx.reply("Пополнение не обнаружено!\n\nВозможно, транзакция обрабатывается, в среднем это длится ~10 минут.\n\nПожалуйста, подождите и нажмите на кнопку обновления\n\n<i>Если пополнение обрабатывается больше 2-х часов, пожалуйста, свяжитесь с поддержкой!</i>", {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: checkBalanceInline
        }
    })
}