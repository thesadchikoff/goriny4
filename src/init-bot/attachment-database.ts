import { prisma } from '@/prisma/prisma.client'

const down = async () => {
	await prisma.currency.deleteMany()
	await prisma.paymentMethod.deleteMany()
}
const up = async () => {
	const getPaymentMethods = await prisma.paymentMethod.findMany()
	const allCurrencies = await prisma.currency.findMany()
	if (getPaymentMethods.length <= 0) {
		await prisma.paymentMethod.createMany({
			data: [
				{
					code: 'alfa-bank',
					name: 'Альфа-Банк',
				},
				{
					code: 'vtb',
					name: 'ВТБ',
				},
				{
					code: 'sber',
					name: 'СберБанк',
				},
				{
					code: 't-bank',
					name: 'Т-Банк (Тинькофф)',
				},
				{
					code: 'rshb',
					name: 'Россельхоз Банк',
				},
				{
					code: 'raiffeisen',
					name: 'Райффайзен Банк',
				},
				{
					code: 'sbp',
					name: 'СБП',
				},
				{
					code: 'yandex-bank',
					name: 'Яндекс Банк',
				},
				{
					code: 'sovcombank',
					name: 'Совкомбанк',
				},
				{
					code: 'otkrytie',
					name: 'Банк "Открытие"',
				},
				{
					code: 'ozon-bank',
					name: 'Ozon Банк',
				},
				{
					code: 'wb-bank',
					name: 'Wildberries Банк',
				},
				{
					code: 'rosbank',
					name: 'Росбанк',
				},
			],
		})
	}
	if (allCurrencies.length <= 0) {
		await prisma.currency.createMany({
			data: [
				{
					key: 'rub',
					value: 'RUB',
				},
				{
					key: 'eur',
					value: 'EUR',
				},
				{
					key: 'usd',
					value: 'USD',
				},
			],
		})
	}
}

export const attachmentDataBase = async () => {
	// await down()
	await up()
}
