import {BotContext} from "@/@types/scenes";
import configService from "@/db/config.service";
import { getBitcoinBalance, BitcoinNetwork, BalanceApiType } from "@/trust-wallet/bitcoin-balance";
import currencyService from "@/service/currency.service";
import {currencyFormatter} from "@/utils/currency-formatter";
import {InlineKeyboardButton} from "telegraf/typings/core/types/typegram";
import {backInlineKeyboard} from "@/keyboards/inline-keyboards/back.inline";

const masterWalletKeyboard: InlineKeyboardButton[][] = [
   [ {
        callback_data: 'coins-withdrawal',
        text: 'Пополнение со всех кошельков'
    }],
    backInlineKeyboard('admin-panel')
]

export const rootWalletAction = async (ctx: BotContext) => {
    const adminWallet = await configService.adminWallet()
    const walletBalance = await getBitcoinBalance(adminWallet.adminWalletAddress!, BitcoinNetwork.MAINNET, BalanceApiType.BLOCKCHAIN_INFO)
    const convertToRuble = await currencyService.convertRubleToBTC(walletBalance.balance, 'rub')
    return ctx.editMessageText(`<b>Информация о root-кошельке</b>\n\n<b>Адрес кошелька:</b> <code>${adminWallet.adminWalletAddress}</code>\n<b>WIF кошелька:</b> <code>${adminWallet.adminWalletWIF}</code>\n<b>Баланс:</b> ${walletBalance.balance.toFixed(8)} BTC ~ ${currencyFormatter(convertToRuble, "RUB")}\n<b>Всего транзакций:</b> ${walletBalance.txCount || 0}`, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: masterWalletKeyboard
        }
    })
}