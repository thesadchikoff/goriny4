import {BotContext} from "@/@types/scenes";
import {prisma} from "@/prisma/prisma.client";
import currencyService from "@/service/currency.service";
import {previousButton} from "@/keyboards/inline-keyboards/previous-button.inline";
import {QueryTriggers} from "@/constants/query-triggers";

export const activeContractsAction = async (ctx: BotContext) => {
    try {
        console.log('[ACTIVE_CONTRACTS] User ID:', ctx.from!.id.toString())
        
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
                contract: true,
                buyer: true,
                seller: true
            }
        })

        console.log('[ACTIVE_CONTRACTS] Found contracts:', activeContracts.length)

        if (activeContracts.length === 0) {
            return ctx.editMessageText('У вас нет активных сделок', {
                reply_markup: {
                    inline_keyboard: [
                        previousButton(QueryTriggers.P2P_TRANSFER())
                    ]
                }
            })
        }

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
    } catch (error) {
        console.error('[ACTIVE_CONTRACTS] Error:', error)
        return ctx.answerCbQuery('Произошла ошибка при получении списка сделок', { show_alert: true })
    }
}