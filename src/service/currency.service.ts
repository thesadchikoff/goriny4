import axios from 'axios'
import type {Currency, CurrencyData} from '../@types/curreny'
import {url} from '../config/api'

class CurrencyService {
	async convertRubleToBTC(value: number, currency: string = "RUB", get: "BTC" | "CURRENCY" = "BTC") {
		console.log('BTC VALUE', value)
		const rate = await this.getCurrency('bitcoin')
		console.log('RATE', rate)
		let bitcoin
		switch (currency) {
			case 'RUB':
				bitcoin = get === 'BTC' ? value * rate?.bitcoin.rub! : value / rate?.bitcoin.rub!
				return bitcoin
			case "USD":
				bitcoin = get === 'BTC' ? value * rate?.bitcoin.usd! : value / rate?.bitcoin.usd!
				return bitcoin
			case "EUR":
				bitcoin = get === 'BTC' ? value * rate?.bitcoin.eur! : value / rate?.bitcoin.eur!
				return bitcoin
			default:
				bitcoin = value * rate?.bitcoin.rub!
				return bitcoin
		}
	}
	async getCurrency<T extends Currency>(
		currency: T
	): Promise<Record<T, CurrencyData> | undefined> {
		try {
			const { data } = await axios.get(
				url + `?ids=${currency}&vs_currencies=rub,usd,eur`
			)
			const result: Record<T, CurrencyData> = {
				[currency]: {
					rub: data[currency].rub,
					usd: data[currency].usd,
					eur: data[currency].eur,
				},
			} as Record<T, CurrencyData>
			return result
		} catch (error) {
			console.log(error)
		}
	}
}
export default new CurrencyService()
