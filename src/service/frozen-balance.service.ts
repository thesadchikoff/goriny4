import { prisma } from '@/prisma/prisma.client';
import userService from '@/db/user.service';

/**
 * Сервис для работы с замороженными средствами в контрактах
 */
class FrozenBalanceService {
  /**
   * Получает сумму замороженных BTC для пользователя
   * @param userId ID пользователя
   * @returns Сумма замороженных BTC
   */
  async getFrozenBalance(userId: string): Promise<number> {
    try {
      // Получаем все записи о замороженных средствах для пользователя
      const frozenBalances = await prisma.frozenBalance.findMany({
        where: {
          userId: userId
        }
      });

      // Суммируем все замороженные средства
      let totalFrozen = 0;
      for (const frozenBalance of frozenBalances) {
        totalFrozen += frozenBalance.amount;
      }

      return totalFrozen;
    } catch (error) {
      console.error('[FROZEN_BALANCE] Error getting frozen balance:', error);
      return 0;
    }
  }

  /**
   * Замораживает средства для контракта
   * @param userId ID пользователя
   * @param contractId ID контракта
   * @param amount Сумма для заморозки
   * @returns Результат операции
   */
  async freezeBalance(userId: string, contractId: number, amount: number): Promise<boolean> {
    try {
      // Проверяем, достаточно ли средств
      const balanceInfo = await this.checkAvailableBalance(userId, amount);
      if (!balanceInfo.sufficient) {
        console.error(`[FROZEN_BALANCE] Insufficient funds for user ${userId}. Required: ${amount}, Available: ${balanceInfo.availableBalance}`);
        return false;
      }

      // Получаем пользователя с кошельком
      const user = await userService.fetchOneById({ id: userId });
      if (!user?.wallet) {
        console.error(`[FROZEN_BALANCE] User ${userId} has no wallet`);
        return false;
      }

      // Создаем запись о замороженных средствах
      await prisma.frozenBalance.create({
        data: {
          userId: userId,
          contractId: contractId,
          amount: amount
        }
      });

      // Обновляем общий замороженный баланс в кошельке
      await prisma.wallet.update({
        where: {
          id: user.wallet.id
        },
        data: {
          frozenBalance: {
            increment: amount
          }
        }
      });

      return true;
    } catch (error) {
      console.error('[FROZEN_BALANCE] Error freezing balance:', error);
      return false;
    }
  }

  /**
   * Размораживает средства для контракта
   * @param userId ID пользователя
   * @param contractId ID контракта
   * @returns Результат операции
   */
  async unfreezeBalance(userId: string, contractId: number): Promise<boolean> {
    try {
      // Получаем запись о замороженных средствах
      const frozenBalance = await prisma.frozenBalance.findFirst({
        where: {
          userId: userId,
          contractId: contractId
        }
      });

      if (!frozenBalance) {
        console.error(`[FROZEN_BALANCE] No frozen balance found for user ${userId} and contract ${contractId}`);
        return false;
      }

      // Получаем пользователя с кошельком
      const user = await userService.fetchOneById({ id: userId });
      if (!user?.wallet) {
        console.error(`[FROZEN_BALANCE] User ${userId} has no wallet`);
        return false;
      }

      // Удаляем запись о замороженных средствах
      await prisma.frozenBalance.delete({
        where: {
          id: frozenBalance.id
        }
      });

      // Обновляем общий замороженный баланс в кошельке
      await prisma.wallet.update({
        where: {
          id: user.wallet.id
        },
        data: {
          frozenBalance: {
            decrement: frozenBalance.amount
          }
        }
      });

      return true;
    } catch (error) {
      console.error('[FROZEN_BALANCE] Error unfreezing balance:', error);
      return false;
    }
  }

  /**
   * Проверяет достаточно ли средств у пользователя с учетом замороженных
   * @param userId ID пользователя
   * @param requiredAmount Требуемая сумма в BTC
   * @returns Информация о доступности средств
   */
  async checkAvailableBalance(userId: string, requiredAmount: number): Promise<{
    sufficient: boolean;
    availableBalance: number;
    totalBalance: number;
    frozenBalance: number;
  }> {
    try {
      // Получаем данные о пользователе и его кошельке
      const user = await userService.fetchOneById({
        id: userId
      });

      if (!user?.wallet) {
        return {
          sufficient: false,
          availableBalance: 0,
          totalBalance: 0,
          frozenBalance: 0
        };
      }

      // Получаем замороженные средства
      const frozenBalance = await this.getFrozenBalance(userId);
      
      // Рассчитываем доступный баланс
      const totalBalance = user.wallet.balance;
      const availableBalance = totalBalance - frozenBalance;

      return {
        sufficient: availableBalance >= requiredAmount,
        availableBalance,
        totalBalance,
        frozenBalance
      };
    } catch (error) {
      console.error('[FROZEN_BALANCE] Error checking available balance:', error);
      return {
        sufficient: false,
        availableBalance: 0,
        totalBalance: 0,
        frozenBalance: 0
      };
    }
  }
}

export default new FrozenBalanceService(); 