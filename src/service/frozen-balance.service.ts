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
      // Получаем все активные контракты на продажу от данного пользователя
      const sellContracts = await prisma.contract.findMany({
        where: {
          userId: userId,
          type: 'sell'
        }
      });

      // Суммируем все замороженные средства
      let totalFrozen = 0;
      for (const contract of sellContracts) {
        totalFrozen += contract.amount;
      }

      return totalFrozen;
    } catch (error) {
      console.error('[FROZEN_BALANCE] Error getting frozen balance:', error);
      return 0;
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