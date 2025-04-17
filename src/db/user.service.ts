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

    /**
     * Проверяет, является ли пользователь администратором
     * @param userId ID пользователя
     * @returns true если пользователь администратор, иначе false
     */
    async isUserAdmin(userId?: number | string): Promise<boolean> {
        if (!userId) return false;
        
        const user = await prisma.user.findFirst({
            where: { id: userId.toString() }
        });
        
        return user?.isAdmin === true;
    }

    /**
     * Получает полную информацию о профиле пользователя
     * @param userId ID пользователя
     * @returns Объект с полной информацией о пользователе
     */
    async getUserProfile(userId: string | number): Promise<any> {
        try {
            // Получаем пользователя со всеми связанными данными
            const user = await prisma.user.findFirst({
                where: { id: userId.toString() },
                include: {
                    wallet: true,
                    currency: true,
                    Contract: {
                        select: {
                            id: true,
                        },
                    },
                    AddressBook: {
                        select: {
                            id: true,
                        },
                    },
                    TicketPersonal: {
                        select: {
                            id: true,
                            status: true,
                        },
                    },
                    Code: {
                        select: {
                            id: true,
                        },
                    },
                    myCodes: {
                        select: {
                            id: true,
                            code: true,
                            amountCoins: true,
                            subscribers: {
                                select: {
                                    id: true,
                                },
                            },
                        },
                    },
                    // Получаем историю транзакций
                    FromTransfers: {
                        select: {
                            id: true,
                            amount: true,
                            createdAt: true,
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                        take: 5,
                    },
                    ToTransfers: {
                        select: {
                            id: true,
                            amount: true,
                            createdAt: true,
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                        take: 5,
                    },
                },
            });

            if (!user) {
                return null;
            }

            // Получаем замороженный баланс, если кошелек существует
            let frozenBalance = 0;
            if (user.wallet) {
                frozenBalance = user.wallet.frozenBalance;
            }

            // Получение общей статистики
            const statistics = {
                totalContracts: user.Contract?.length || 0,
                totalAddresses: user.AddressBook?.length || 0,
                totalTickets: user.TicketPersonal?.length || 0,
                activeTickets: user.TicketPersonal?.filter(ticket => 
                    ticket.status !== 'SUCCESS' && ticket.status !== 'DECLINE'
                ).length || 0,
                totalCodes: user.myCodes?.length || 0,
                totalSubscribers: user.myCodes?.reduce((sum, code) => 
                    sum + (code.subscribers?.length || 0), 0) || 0,
                totalTransactions: (user.FromTransfers?.length || 0) + (user.ToTransfers?.length || 0),
            };

            // Создаем объект с профилем пользователя
            return {
                user: {
                    id: user.id,
                    username: user.username,
                    login: user.login || 'Не указан',
                    isAdmin: user.isAdmin,
                    isBtcSubscribed: user.isBtcSubscribed,
                    isBlocked: user.isBlocked,
                    isFreezeTransfer: user.isFreezeTransfer,
                    registeredAt: user.createdAt,
                },
                wallet: user.wallet ? {
                    id: user.wallet.id,
                    address: user.wallet.address,
                    balance: user.wallet.balance,
                    frozenBalance: frozenBalance,
                    availableBalance: user.wallet.balance - frozenBalance,
                } : null,
                currency: user.currency ? {
                    id: user.currency.id,
                    value: user.currency.value,
                    key: user.currency.key,
                } : { value: 'rub', key: 'RUB' },
                statistics: statistics,
                recentActivity: {
                    outgoingTransfers: user.FromTransfers,
                    incomingTransfers: user.ToTransfers,
                },
            };
        } catch (error) {
            console.error('Ошибка при получении профиля пользователя:', error);
            return null;
        }
    }
}

export default new UserService();