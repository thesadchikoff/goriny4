import {BotContext} from "@/@types/scenes";
import {prisma} from "@/prisma/prisma.client";
import {previousButton} from "@/keyboards/inline-keyboards/previous-button.inline";
import {QueryTriggers} from "@/constants/query-triggers";
import {generateUrlForUser} from "@/utils/generate-user-url";
import currencyService from "@/service/currency.service";

export const activeContractDetailAction = async (ctx: BotContext) => {
    const contractId = ctx.match[1]
    const contractTransaction = await prisma.contractTransaction.findFirst({
        where: {
            id: contractId
        },
        include: {
            buyer: true,
            seller: true,
            contract: true
        }
    })
    if (!contractTransaction) return ctx.reply('Контракт не найден', {
        reply_markup: {
            inline_keyboard: [
                previousButton(QueryTriggers.ACTIVE_CONTRACTS())
            ]
        }
    })
    const amountToBtc = await currencyService.convertRubleToBTC(
        contractTransaction.amount,
        contractTransaction.contract.currency!,
        "CURRENCY"
    );
    const sellerUrl = generateUrlForUser(contractTransaction.seller!.login!)
    const buyerUrl = generateUrlForUser(contractTransaction.buyer!.login!)
    return ctx.editMessageText(`<b>Контракт #${contractTransaction.id}</b>\n\n<b>Покупает: </b><a href="${buyerUrl}">${contractTransaction.buyer!.login}</a>\n<b>Продает: </b><a href="${sellerUrl}">${contractTransaction.seller!.login}</a>\n<b>Сумма:</b> ${amountToBtc.toFixed(6)} BTC\n\n<b>Статус:</b> Ожидает оплаты`, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                previousButton(QueryTriggers.ACTIVE_CONTRACTS())
            ]
        }
    })
}