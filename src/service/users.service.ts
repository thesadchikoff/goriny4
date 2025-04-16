import { prisma } from '@/prisma/prisma.client';
import { dateFormat } from '@/utils/format-date';

/**
 * Сервис для работы со списком пользователей
 */
class UsersService {
  /**
   * Получает список пользователей с пагинацией
   * @param page Номер страницы (начиная с 1)
   * @param limit Количество пользователей на странице
   * @returns Объект с пользователями и информацией о пагинации
   */
  async getUsersList(page = 1, limit = 5) {
    try {
      // Получаем общее количество пользователей
      const totalUsers = await prisma.user.count();
      
      // Вычисляем общее количество страниц
      const totalPages = Math.ceil(totalUsers / limit);
      
      // Убеждаемся, что запрашиваемая страница в допустимых пределах
      if (page < 1) page = 1;
      if (page > totalPages && totalPages > 0) page = totalPages;
      
      // Вычисляем количество пользователей для пропуска (для пагинации)
      const skip = (page - 1) * limit;
      
      // Получаем пользователей с пагинацией
      const users = await prisma.user.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc' // Сортировка по дате регистрации (новые в начале)
        },
        include: {
          Contract: true,   // Добавляем контракты для подсчета количества сделок
          wallet: true      // Добавляем информацию о кошельке
        }
      });
      
      // Форматируем пользователей для вывода
      const formattedUsers = users.map(user => ({
        id: user.id,
        username: user.username || 'Unknown',
        login: user.login || null,
        isAdmin: user.isAdmin,
        isBlocked: user.isBlocked,
        dealsCount: user.Contract.length,
        balance: user.wallet?.balance || 0,
        createdAt: user.createdAt ? dateFormat(user.createdAt) : 'Unknown',
      }));
      
      return {
        users: formattedUsers,
        pagination: {
          page,
          limit,
          totalUsers,
          totalPages
        }
      };
    } catch (error) {
      console.error('[USERS_SERVICE] Error getting users list:', error);
      throw error;
    }
  }
  
  /**
   * Получает детальную информацию о пользователе
   * @param userId ID пользователя
   * @returns Детальная информация о пользователе
   */
  async getUserDetails(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: userId
        },
        include: {
          Contract: true,
          wallet: true,
          Requisite: {
            include: {
              paymentMethod: true
            }
          }
        }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Получаем объявления на покупку и продажу
      const buyContracts = user.Contract.filter(contract => contract.type === 'buy');
      const sellContracts = user.Contract.filter(contract => contract.type === 'sell');
      
      return {
        id: user.id,
        username: user.username || 'Unknown',
        login: user.login,
        isAdmin: user.isAdmin,
        isBlocked: user.isBlocked,
        dealsCount: user.Contract.length,
        buyDealsCount: buyContracts.length,
        sellDealsCount: sellContracts.length,
        balance: user.wallet?.balance || 0,
        walletAddress: user.wallet?.address,
        requisites: user.Requisite.map(req => ({
          id: req.id,
          paymentMethod: req.paymentMethod.name,
          currency: req.currency,
          data: req.phoneOrbankCardNumber
        })),
        createdAt: user.createdAt ? dateFormat(user.createdAt) : 'Unknown',
      };
    } catch (error) {
      console.error('[USERS_SERVICE] Error getting user details:', error);
      throw error;
    }
  }
  
  /**
   * Блокирует/разблокирует пользователя
   * @param userId ID пользователя
   * @param block Флаг блокировки (true - заблокировать, false - разблокировать)
   * @returns Обновленный статус пользователя
   */
  async toggleUserBlock(userId: string, block: boolean) {
    try {
      const user = await prisma.user.update({
        where: {
          id: userId
        },
        data: {
          isBlocked: block
        }
      });
      
      return {
        id: user.id,
        isBlocked: user.isBlocked
      };
    } catch (error) {
      console.error('[USERS_SERVICE] Error toggling user block status:', error);
      throw error;
    }
  }
  
  /**
   * Получает информацию о пользователе по ID
   * @param userId ID пользователя
   * @returns Информация о пользователе или null, если пользователь не найден
   */
  async getUserById(userId: number | string) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          id: userId.toString()
        },
        include: {
          wallet: true,
          Contract: true
        }
      });
      
      if (!user) {
        return null;
      }
      
      // Получаем количество транзакций (для покупателя и продавца)
      const buyerTransactions = await prisma.contractTransaction.count({
        where: { buyerId: userId.toString() }
      });
      
      const sellerTransactions = await prisma.contractTransaction.count({
        where: { sellerId: userId.toString() }
      });
      
      const transactionCount = buyerTransactions + sellerTransactions;
      
      // Получаем количество контрактов
      const contractCount = user.Contract.length;
      
      return {
        id: user.id,
        username: user.username || 'Не указано',
        login: user.login || null,
        isAdmin: user.isAdmin,
        isBlocked: user.isBlocked,
        balance: user.wallet?.balance || 0,
        createdAt: user.createdAt,
        contractCount: contractCount,
        contractTransactionCount: transactionCount
      };
    } catch (error) {
      console.error('[USERS_SERVICE] Error getting user by ID:', error);
      return null;
    }
  }
}

export default new UsersService(); 