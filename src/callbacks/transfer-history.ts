import { Context } from 'telegraf'
import { prisma } from '../prisma/prisma.client'
import { currencyFormatter } from '../utils/currency-formatter'

interface TransferWithUsers {
	id: string
	fromUserId: string
	toUserId: string
	count: number
	createdAt: Date
	fromUser: {
		username: string
	}
	toUser: {
		username: string
	}
}

export const transferHistory = async (ctx: any) => {
	try {
		const userId = ctx.from?.id.toString()
		if (!userId) {
			await ctx.reply('Ошибка: не удалось определить пользователя')
			return
		}

		const transfers = await prisma.transfer.findMany({
			where: {
				OR: [
					{ fromUserId: userId },
					{ toUserId: userId }
				]
			},
			include: {
				fromUser: {
					select: {
						username: true
					}
				},
				toUser: {
					select: {
						username: true
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			},
			take: 10
		})

		if (transfers.length === 0) {
			await ctx.reply('У вас пока нет истории переводов')
			return
		}

		const formattedTransfers = transfers.map((transfer: TransferWithUsers) => {
			const isOutgoing = transfer.fromUserId === userId
			const otherUser = isOutgoing ? transfer.toUser : transfer.fromUser
			const direction = isOutgoing ? '➡️ Отправлен' : '⬅️ Получен'
			const amount = currencyFormatter(transfer.count, 'BTC')
			
			return `${direction} перевод\n` +
				   `👤 Пользователь: ${otherUser.username}\n` +
				   `💰 Сумма: ${amount}\n` +
				   `📅 Дата: ${transfer.createdAt.toLocaleString()}\n`
		})

		await ctx.reply(
			'📋 История последних переводов:\n\n' +
			formattedTransfers.join('\n')
		)
	} catch (error) {
		console.error('Error in transferHistory:', error)
		await ctx.reply('Произошла ошибка при получении истории переводов')
	}
}
