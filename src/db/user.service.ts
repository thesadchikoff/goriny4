import {prisma} from "@/prisma/prisma.client";
import {UserFetchResult} from "@/@types/user";
import adminNotifyModule from "@/core/admin/admin-notify.module";


export class UserService{
    fetchAll(): UserFetchResult<"findMany"> {
        return prisma.user.findMany({
            include: {
                wallet: true
            }
        })
    }

    userWallets() {
        return prisma.wallet.findMany()
    }

    async fetchOneById(
        params: { id: string | number } | { login: string }
    ) {
        const orConditions: { id?: string; login?: string }[] = [];

        if ('id' in params) {
            orConditions.push({ id: params.id.toString() });
        }

        if ('login' in params) {
            orConditions.push({ login: params.login });
        }

        return prisma.user.findFirst({
            where: {
                OR: orConditions
            },
            include: {
                wallet: true
            }
        });
    }

    updateUserWalletBalance({id, value}: {id: string, value: number}) {
        return prisma.wallet.update({
            where: {
               id
            },
            data: {
                balance: value
            }
        })
    }

    async changeUserBalance({params, value}: {
        params: { id: string | number } | { login: string },
        value: number
    }) {
        const user = await this.fetchOneById(params);
        if (!user || !user.wallet) return null
        const wallet = await this.updateUserWalletBalance({
            id: user.wallet.id,
            value
        })
        const differenceBalance = Math.abs(user.wallet.balance - value)
        await adminNotifyModule.sendNotify(`<b>Оповещение</b>\n\nПользователь <code>${user.username}</code> пополнил баланс на <b>${differenceBalance} BTC</b>`)
        return {
            currentBalance: wallet.balance
        }
    }
}

export default new UserService();