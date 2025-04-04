import {prisma} from "@/prisma/prisma.client";
import {InlineKeyboardButton} from "telegraf/typings/core/types/typegram";
import adminNotifyModule from "@/core/admin/admin-notify.module";
import {BotConfig} from "@/config";
import {BotContext} from "@/@types/scenes";
import {QueryTriggers} from "@/constants/query-triggers";
import currencyService from "@/service/currency.service";
import userService from "@/db/user.service";
import {generateUrlForUser} from "@/utils/generate-user-url";
import {bot} from "@/config/bot";

class DisputeModule {

    async isSeller(id: string) {
        const user = await this.getUser(id)
        if (!user || !user.SellerContractTransaction) return null
        return Boolean(user.SellerContractTransaction.sellerId)
    }

    async getUser(id: string) {
        return prisma.user.findFirst({
            where: {
                id
            },
            include: {
                SellerContractTransaction: true
            }
        })
    }

    getDisputeButton(action: "open" | "close"): InlineKeyboardButton[] {
        if (action === "open") {
            return this.openDisputeButton()
        } else {
            return this.closeDisputeButton()
        }
    }

    async createDispute(contractTransactionId: string) {
        return prisma.dispute.create({
            data: {
                contractTransactionId
            }
        })
    }


    async updateStatusContractTransaction(contractTransactionId: string, value: boolean) {
        return prisma.contractTransaction.update({
            where: {
                id: contractTransactionId
            },
             data: {
                isAccepted: value
             }
        })
    }

    async startDispute(ctx: BotContext) {
        const contractTransaction = await prisma.contractTransaction.findFirst({
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
                buyer: true,
                seller: true,
                contract: {
                    include: {
                        paymentMethod: true
                    }
                }
            }
        })
        const activeDispute = await prisma.dispute.findFirst({
            include: {
                contractTransaction: true
            },
            where: {
                contractTransactionId: contractTransaction!.id
            }
        })
        if (activeDispute) {
            return ctx.reply('Спор по данной сделке уже открыт')
        }
        const btcFromCurrency = await currencyService.convertRubleToBTC(contractTransaction.amount, contractTransaction.contract.currency, 'CURRENCY')
        console.log(btcFromCurrency)
        await this.createDispute(contractTransaction!.id)
        await this.updateStatusContractTransaction(contractTransaction!.id, false)

        const supportLinks = `<a href="https://t.me/nevermoon">Связь с администрацией</a> | <a href="https://t.me/grovy_alert_bot?start=support">Поддержка</a>`

        await bot.telegram.sendMessage(contractTransaction!.buyer!.id, `${BotConfig.App.DisputeStartMessage.replace('%t', contractTransaction!.code).replace('%b', `@${contractTransaction!.buyer!.username}`).replace('%s', `@${contractTransaction!.seller!.username}`).replace('%v', contractTransaction!.amount.toString()).replace('%c', contractTransaction?.contract.currency!).replace('%a',btcFromCurrency.toFixed(6)).replace('%m', contractTransaction!.contract.paymentMethod?.name)}\n\n${supportLinks}`, {
            parse_mode: 'HTML',
        })

        await bot.telegram.sendMessage(contractTransaction!.seller!.id, `${BotConfig.App.DisputeStartMessage.replace('%t', contractTransaction!.code).replace('%b', `@${contractTransaction!.buyer!.username}`).replace('%s', `@${contractTransaction!.seller!.username}`).replace('%v', contractTransaction!.amount.toString()).replace('%c', contractTransaction?.contract.currency!).replace('%a',btcFromCurrency.toFixed(6)).replace('%m', contractTransaction!.contract.paymentMethod?.name)}\n\n${supportLinks}`, {
            parse_mode: 'HTML',
        })

        await adminNotifyModule.sendNotify(BotConfig.App.DisputeStartMessage.replace('%t', contractTransaction!.code).replace('%b', `@${contractTransaction!.buyer!.username}`).replace('%s', `@${contractTransaction!.seller!.username}`).replace('%v', contractTransaction!.amount.toString()).replace('%c', contractTransaction?.contract.currency!).replace('%a',btcFromCurrency.toFixed(6)).replace('%m', contractTransaction!.contract.paymentMethod?.name), [[{
            callback_data: QueryTriggers.ACCEPT_FOR_BUYER(contractTransaction!.contract!.id),
            text: "Закрыть в пользу покупателя"
        }, {
            callback_data: QueryTriggers.ACCEPT_FOR_SELLER(contractTransaction!.contract!.id),
            text: "Закрыть в пользу продавца"
        }]])
    }

    public async accessForBuyer(ctx: BotContext) {
        console.log(ctx)
        const contractId = Number(ctx.match[1])
        const contract = await prisma.contract.findFirst({
            where: {
                id: contractId
            },
            include: {
                ContractTransaction: {
                    where: {
                        contractId
                    },
                    include: {
                        buyer: {
                            include: {
                                wallet: true
                            }
                        },
                        seller: {
                            include: {
                                wallet: true
                            }
                        }
                    }
                },
            }
        })

        const contractTransaction = contract!.ContractTransaction[0]

        const activeDispute = await prisma.dispute.findFirst({
            where: {
                contractTransactionId: contractTransaction.id
            }
        })

        if (!activeDispute) {
            return ctx.reply('Спор по данному обращению уже закрыт.')
        }

        if (!contract || !contractTransaction) {
            return 'Контракт не найден'
        }

        const btcFromCurrency = await currencyService.convertRubleToBTC(contractTransaction.amount, contract.currency!, "CURRENCY")
        console.log(btcFromCurrency, 'btc from currency')
        if (contract.type === 'buy') {
            userService.updateUserWalletBalance({
                id: contractTransaction.buyer!.wallet!.id!,
                value: contractTransaction.buyer!.wallet!.balance + btcFromCurrency
            })
            userService.updateUserWalletBalance({
                id: contractTransaction.seller!.wallet!.id!,
                value: contractTransaction.seller!.wallet!.balance - btcFromCurrency
            })
        }
        await prisma.dispute.delete({
            where: {
                contractTransactionId: contractTransaction.id
            }
        })
        const url = generateUrlForUser(contractTransaction.buyer!.login!)
        return ctx.reply(`Спор решен в пользу покупателя <a href="${url}">${contractTransaction.buyer!.login}</a>\nПокупателю будет произведен возврат в размере <b>${btcFromCurrency} BTC</b>`, {
            parse_mode: 'HTML'
        })
    }

    public async accessForSeller(ctx: BotContext) {
        const contractId = Number(ctx.match[1])
        const contract = await prisma.contract.findFirst({
            where: {
                id: contractId
            },
            include: {
                ContractTransaction: {
                    where: {
                        contractId
                    },
                    include: {
                        buyer: {
                            include: {
                                wallet: true
                            }
                        },
                        seller: {
                            include: {
                                wallet: true
                            }
                        }
                    }
                },
            }
        })

        const contractTransaction = contract!.ContractTransaction[0]

        const activeDispute = await prisma.dispute.findFirst({
            where: {
                contractTransactionId: contractTransaction.id
            }
        })

        if (!activeDispute) {
            return ctx.reply('Спор по данному обращению уже закрыт.')
        }

        if (!contract || !contractTransaction) {
            return 'Контракт не найден'
        }

        const btcFromCurrency = await currencyService.convertRubleToBTC(contractTransaction.amount, contract.currency!, "CURRENCY")
        console.log(btcFromCurrency, 'btc from currency')
        if (contract.type === 'sell') {
            userService.updateUserWalletBalance({
                id: contractTransaction.buyer!.wallet!.id!,
                value: contractTransaction.buyer!.wallet!.balance - btcFromCurrency
            })
            userService.updateUserWalletBalance({
                id: contractTransaction.seller!.wallet!.id!,
                value: contractTransaction.seller!.wallet!.balance + btcFromCurrency
            })
        }
        await prisma.dispute.delete({
            where: {
                contractTransactionId: contractTransaction.id
            }
        })
        const url = generateUrlForUser(contractTransaction.seller!.login!)
        return ctx.reply(`Спор решен в пользу продавца <a href="${url}">${contractTransaction.seller!.login}</a>\nПокупателю будет произведен возврат в размере <b>${btcFromCurrency} BTC</b>`, {
            parse_mode: 'HTML'
        })
    }

    private openDisputeButton(): InlineKeyboardButton[] {
        return [
            {
                callback_data: 'open-dispute',
                text: "Открыть спор"
            }
        ]
    }

    private closeDisputeButton(): InlineKeyboardButton[] {
        return [
            {
                callback_data: 'close-dispute',
                text: "Закрыть спор"
            }
        ]
    }


    
}

export default new DisputeModule();