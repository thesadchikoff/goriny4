import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface UserBalance {
    userId: number;
    balance: number;
    starsSpent: number;
    lastUpdate: Date;
}

export class BalanceService {
    // Получить баланс пользователя
    static async getUserBalance(userId: number): Promise<number> {
        const user = await prisma.user.findUnique({
            where: { telegramId: userId },
            select: { balance: true }
        });
        
        return user?.balance || 0;
    }
    
    // Пополнить баланс пользователя
    static async addToBalance(userId: number, amount: number): Promise<void> {
        await prisma.user.upsert({
            where: { telegramId: userId },
            update: {
                balance: {
                    increment: amount
                },
                starsSpent: {
                    increment: amount
                }
            },
            create: {
                telegramId: userId,
                balance: amount,
                starsSpent: amount
            }
        });
    }
    
    // Снять средства с баланса
    static async withdrawFromBalance(userId: number, amount: number): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { telegramId: userId },
            select: { balance: true }
        });
        
        if (!user || user.balance < amount) {
            return false; // Недостаточно средств
        }
        
        await prisma.user.update({
            where: { telegramId: userId },
            data: {
                balance: {
                    decrement: amount
                }
            }
        });
        
        return true;
    }
    
    // Получить историю транзакций
    static async getTransactionHistory(userId: number): Promise<any[]> {
        return await prisma.transaction.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
    }
    
    // Записать транзакцию
    static async logTransaction(userId: number, amount: number, type: 'deposit' | 'withdrawal', description: string): Promise<void> {
        await prisma.transaction.create({
            data: {
                userId,
                amount,
                type,
                description,
                createdAt: new Date()
            }
        });
    }
} 