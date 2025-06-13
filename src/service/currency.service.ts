import axios from 'axios'
import type {Currency, CurrencyData} from '../@types/curreny'
import {url} from '../config/api'

// Кэш курсов валют для уменьшения количества запросов к API
interface CurrencyCacheItem {
	data: Record<Currency, CurrencyData>;
	timestamp: number;
}

class CurrencyService {
	// Кэш для хранения результатов последнего запроса к API
	private currencyCache: CurrencyCacheItem | null = null;
	// Время жизни кэша в миллисекундах (10 минут)
	private readonly CACHE_TTL: number = 10 * 60 * 1000;

	async convertRubleToBTC(value: number, currency: string = 'rub', isBTCTOCurrency = false): Promise<number> {
		// Проверяем наличие параметра currency
		if (!currency) {
			console.error('Ошибка: параметр currency в convertRubleToBTC не указан или имеет значение undefined');
			currency = 'rub'; // Используем рубли по умолчанию, если валюта не указана
		}
		
		const data = await this.getCurrency('bitcoin')
		if (!data) {
			throw new Error("Error fetching currency data")
		}

		const currencyData = data['bitcoin'] as CurrencyData
		// Безопасный доступ к свойству
		const currencyKey = currency.toLowerCase() as keyof CurrencyData;
		const rate = currencyData[currencyKey];
		
		// Дополнительная проверка на случай, если курс не найден
		if (rate === undefined || rate === null) {
			console.error(`Курс для валюты ${currency} не найден`);
			throw new Error(`Currency rate for ${currency} not found`);
		}

		if (isBTCTOCurrency) {
			return parseFloat((value * rate).toFixed(2))
		}

		return parseFloat((value / rate).toFixed(8))
	}

	async getCurrentBTCRate(currency: keyof CurrencyData = 'rub'): Promise<number | null> {
		try {
			// Проверяем наличие и корректность параметра currency
			if (!currency) {
				console.error('Ошибка: параметр currency не указан или имеет значение undefined');
				return null;
			}
			
			const data = await this.getCurrency('bitcoin')
			if (!data) {
				return null
			}
			
			const currencyData = data['bitcoin'] as CurrencyData
			// Проверяем, что currency - строка, прежде чем вызывать toLowerCase
			const currencyKey = typeof currency === 'string' ? 
				currency.toLowerCase() as keyof CurrencyData : 
				currency;
				
			return currencyData[currencyKey]
		} catch (error) {
			console.error('Error getting BTC rate:', error)
			throw error; // Пробрасываем ошибку для обработки в вызывающем коде
		}
	}

	async getCurrency<T extends Currency>(
		currency: T
	): Promise<Record<T, CurrencyData> | undefined> {
		try {
			// Проверяем кэш
			if (this.currencyCache && (Date.now() - this.currencyCache.timestamp) < this.CACHE_TTL) {
				console.log(`Используем кэшированные данные для ${currency}`);
				// Если запрашиваемая валюта есть в кэше, возвращаем её
				if (this.currencyCache.data[currency]) {
					return { 
						[currency]: this.currencyCache.data[currency] 
					} as Record<T, CurrencyData>;
				}
			}

			console.log(`Запрос к API для получения курса ${currency}: ${url}?ids=${currency}&vs_currencies=rub,usd,eur`);
			const { data } = await axios.get(
				url + `?ids=${currency}&vs_currencies=rub,usd,eur`
			)
			console.log(`Получен ответ от API:`, data);

			// Явное приведение типа для безопасной работы с данными
			const typedData = data as Record<string, Record<string, number>>;
			
			const result: Record<T, CurrencyData> = {
				[currency]: {
					rub: typedData[currency].rub,
					usd: typedData[currency].usd,
					eur: typedData[currency].eur,
				},
			} as Record<T, CurrencyData>

			// Обновляем кэш
			this.currencyCache = {
				data: { 
					bitcoin: result[currency] 
				} as Record<Currency, CurrencyData>,
				timestamp: Date.now()
			};

			return result
		} catch (error) {
			console.error(`Ошибка при получении курса ${currency}:`, error);
			// Безопасная проверка является ли ошибка AxiosError
			const axiosError = error as any;
			if (axiosError && axiosError.response) {
				console.error('Детали ошибки:', {
					status: axiosError.response?.status,
					statusText: axiosError.response?.statusText,
					data: axiosError.response?.data,
					headers: axiosError.response?.headers
				});

				// Если код ошибки 429 (Too Many Requests), но у нас есть кэшированные данные,
				// возвращаем их, даже если они устарели
				if (axiosError.response?.status === 429 && this.currencyCache && this.currencyCache.data[currency]) {
					console.log(`Возвращаем устаревшие кэшированные данные из-за ограничения API`);
					return { 
						[currency]: this.currencyCache.data[currency] 
					} as Record<T, CurrencyData>;
				}
			}
			throw error; // Пробрасываем ошибку для обработки в getBTCRateWithRetry
		}
	}
}
export default new CurrencyService()
