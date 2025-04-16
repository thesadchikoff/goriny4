import { prisma } from '../prisma/prisma.client'

/**
 * Пополняет баланс пользователя
 * @param userId ID пользователя
 * @param amount Сумма для пополнения
 * @returns Обновленный кошелек пользователя
 * @throws Error если пользователь или кошелек не найдены
 */
export const addBalance = async (userId: string, amount: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true }
  })

  if (!user || !user.wallet) {
    throw new Error('Пользователь или кошелек не найден')
  }

  return prisma.wallet.update({
    where: { id: user.wallet.id },
    data: {
      balance: {
        increment: amount
      }
    }
  })
}

/**
 * Списывает средства с баланса пользователя
 * @param userId ID пользователя
 * @param amount Сумма для списания
 * @returns Обновленный кошелек пользователя
 * @throws Error если пользователь или кошелек не найдены, или недостаточно средств
 */
export const deductBalance = async (userId: string, amount: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true }
  })

  if (!user || !user.wallet) {
    throw new Error('Пользователь или кошелек не найден')
  }

  if (user.wallet.balance < amount) {
    throw new Error('Недостаточно средств')
  }

  return prisma.wallet.update({
    where: { id: user.wallet.id },
    data: {
      balance: {
        decrement: amount
      }
    }
  })
} 