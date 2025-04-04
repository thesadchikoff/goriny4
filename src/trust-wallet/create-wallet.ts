import {prisma} from '../prisma/prisma.client'
import { createBitcoinWallet } from './bitcoin-wallet'
import { BitcoinNetwork } from './bitcoin-balance'

export const createWallet = async (
	telegramId: number
) => {
	const user = await prisma.user.findFirst({
		where: {
			id: telegramId.toString(),
		},
		include: {
			wallet: true,
		},
	})
	if (!user || user.wallet) {
		return null
	}
	// Создаем новый кошелек в основной сети Bitcoin
	const wallet = createBitcoinWallet(BitcoinNetwork.MAINNET)
	return prisma.wallet.create({
		data: {
			user: {
				connect: {
					id: user.id,
				},
			},
			address: wallet.address,
			wif: wallet.wif
		},
	})
}
