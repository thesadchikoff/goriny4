import {BotContext} from "@/@types/scenes";
import {prisma} from "@/prisma/prisma.client";
import currencyService from "@/service/currency.service";
import {previousButton} from "@/keyboards/inline-keyboards/previous-button.inline";
import {QueryTriggers} from "@/constants/query-triggers";

export const activeContractsAction = async (ctx: BotContext) => {
    const activeContracts = await prisma.contractTransaction.findMany({
        where: {
            OR: [
                {
                    sellerId: ctx.from!.id.toString()
                },
                {
                    buyerId: ctx.from!.id.toString()
                }
            ]
        },
        include: {
            contract: true
        }
    })



    const buttons = await Promise.all(
        activeContracts.map(async (activeContract) => {
            const amountToBtc = await currencyService.convertRubleToBTC(
                activeContract.amount,
                activeContract.contract.currency!,
                false
            );
            return [
                {
                    callback_data: `active-contract-${activeContract.id}`,
                    text: `${amountToBtc.toFixed(6)} BTC [${activeContract.sellerId === ctx.from!.id.toString() ? 'Продажа' : 'Покупка'}]`,
                },
            ];
        })
    );

    await ctx.editMessageText('Ваши активные сделки:', {
        reply_markup: {
            inline_keyboard: [
                ...buttons,
                previousButton(QueryTriggers.P2P_TRANSFER()),
            ],
        },
    });

}