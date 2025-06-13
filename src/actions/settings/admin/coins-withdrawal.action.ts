import { BotContext } from '@/@types/scenes'
import configService from '@/db/config.service'
import userService from '@/db/user.service'
import { createTransaction, sendTransaction } from '@/trust-wallet/1'
import { Wallet } from '@prisma/client'

let isProcessRunning = false // Флаг состояния процесса

export const coinsWithdrawalAction = async (ctx: BotContext) => {
	if (isProcessRunning) {
		// Если процесс уже в работе, уведомляем пользователя
		await ctx.reply(
			'Процесс уже в работе. Пожалуйста, дождитесь его завершения.'
		)
		return
	}

	// Устанавливаем флаг процесса в "работает"
	isProcessRunning = true

	// Отправляем начальное сообщение и сохраняем message_id
	const initialMessage = await ctx.reply(
		'Задача на пополнение мастер-кошелька создана и находится в процессе…\n\nВы можете продолжать пользоваться ботом далее. По завершению процесса Вам поступит уведомление о статусе её завершения.'
	)
	const userWallets = await userService.userWallets()
	const masterWallet = await configService.adminWallet()

	// Запускаем обработку и фоновый мониторинг
	startBackgroundTask(
		ctx,
		initialMessage.message_id,
		userWallets,
		masterWallet.adminWalletAddress!
	)
}

const startBackgroundTask = async (
	ctx: BotContext,
	messageId: number,
	wallets: Wallet[],
	masterAddress: string
) => {
	try {
		// Статистика операций
		let successCount = 0;
		let errorCount = 0;
		let totalTransferred = 0;
		let processedCount = 0;
		let lastUpdateTime = Date.now();
		const updateInterval = 5000; // 5 секунд между обновлениями статуса
		
		// Хранилище результатов (используем Map для эффективности при большом количестве данных)
		const successfulTransfers = new Map<string, { amount: number; txHash: string }>();
		const failedTransfers = new Map<string, string>(); // адрес -> ошибка
		
		// Отбираем только кошельки с положительным балансом
		const walletsWithBalance = wallets.filter(wallet => 
			wallet.balance && parseFloat(wallet.balance.toString()) > 0.0001 // Минимальный порог для покрытия комиссии
		);

		if (walletsWithBalance.length === 0) {
			await ctx.telegram.editMessageText(
				ctx.chat!.id,
				messageId,
				undefined,
				'Нет кошельков с достаточным балансом для перевода. Минимальный баланс должен быть больше 0.0001 BTC.'
			);
			isProcessRunning = false;
			return;
		}

		// Обновляем сообщение о начале процесса
		await ctx.telegram.editMessageText(
			ctx.chat!.id,
			messageId,
			undefined, 
			`Начинаем перевод средств с ${walletsWithBalance.length} кошельков на мастер-кошелек ${masterAddress}...\n\n⏳ Инициализация...`
		);
		
		// Функция для обновления статуса
		const updateStatus = async (force = false) => {
			const now = Date.now();
			if (!force && now - lastUpdateTime < updateInterval) {
				return; // Не обновляем статус слишком часто
			}
			lastUpdateTime = now;
			
			const progressPercent = Math.floor((processedCount / walletsWithBalance.length) * 100);
			const progressBar = generateProgressBar(progressPercent);
			
			let statusMessage = `⚙️ Обработка в процессе...\n\n`;
			statusMessage += `${progressBar} ${progressPercent}% (${processedCount}/${walletsWithBalance.length})\n\n`;
			statusMessage += `📊 Текущая статистика:\n`;
			statusMessage += `• Успешных переводов: ${successCount}\n`;
			statusMessage += `• Ошибок: ${errorCount}\n`;
			statusMessage += `• Всего переведено: ${totalTransferred.toFixed(8)} BTC\n\n`;
			statusMessage += `⏳ Пожалуйста, ожидайте завершения операции...`;
			
			try {
				await ctx.telegram.editMessageText(
					ctx.chat!.id,
					messageId,
					undefined,
					statusMessage
				);
			} catch (error) {
				// Игнорируем ошибки редактирования (могут возникнуть, если сообщение не изменилось)
				console.log("Ошибка при обновлении статуса:", error);
			}
		};
		
		// Генерация строки прогресс-бара
		const generateProgressBar = (percent: number): string => {
			const completed = Math.floor(percent / 10);
			const remaining = 10 - completed;
			return '█'.repeat(completed) + '░'.repeat(remaining);
		};

		// Обрабатываем кошельки пакетами для оптимизации использования памяти
		const batchSize = 200; // Размер пакета
		const totalBatches = Math.ceil(walletsWithBalance.length / batchSize);
		
		for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
			const startIdx = batchNum * batchSize;
			const endIdx = Math.min(startIdx + batchSize, walletsWithBalance.length);
			const currentBatch = walletsWithBalance.slice(startIdx, endIdx);
			
			// Параллельная обработка пакета кошельков с ограничением
			const batchPromises = currentBatch.map(wallet => 
				processWallet(wallet, masterAddress, successfulTransfers, failedTransfers)
					.then(result => {
						processedCount++;
						if (result.success) {
							successCount++;
							totalTransferred += result.amount || 0;
						} else {
							errorCount++;
						}
						return updateStatus(); // Обновляем статус после каждого обработанного кошелька
					})
			);
			
			// Обрабатываем пакет с ограничением параллельных запросов
			await processBatchWithRateLimit(batchPromises, 10); // 10 одновременных запросов
			
			// Принудительно обновляем статус после каждого пакета
			await updateStatus(true);
		}
		
		// Формируем финальный отчет
		const generateFinalReport = () => {
			let reportMessage = `✅ Операция завершена\n\n`;
			reportMessage += `📊 Статистика:\n`;
			reportMessage += `• Всего кошельков обработано: ${walletsWithBalance.length}\n`;
			reportMessage += `• Успешных переводов: ${successCount}\n`;
			reportMessage += `• Ошибок: ${errorCount}\n`;
			reportMessage += `• Всего переведено: ${totalTransferred.toFixed(8)} BTC\n\n`;
			
			// Создаем сокращенные версии отчета для сообщения в Telegram
			// (ограничение на длину сообщения - 4096 символов)
			if (successCount > 0) {
				reportMessage += `✅ Успешные переводы: ${successCount}\n`;
				
				// Добавляем только первые 20 успешных переводов
				if (successCount <= 20) {
					// Если успешных переводов немного, показываем все
					let i = 0;
					for (const [address, data] of successfulTransfers.entries()) {
						const shortTxHash = data.txHash.substring(0, 8) + '...' + data.txHash.substring(data.txHash.length - 8);
						reportMessage += `${++i}. ${address}: ${data.amount.toFixed(8)} BTC (${shortTxHash})\n`;
					}
				} else {
					// Иначе показываем только первые несколько и информацию о том, где найти полный отчет
					let i = 0;
					const iterator = successfulTransfers.entries();
					for (let j = 0; j < 10; j++) {
						const [address, data] = iterator.next().value;
						const shortTxHash = data.txHash.substring(0, 8) + '...' + data.txHash.substring(data.txHash.length - 8);
						reportMessage += `${++i}. ${address}: ${data.amount.toFixed(8)} BTC (${shortTxHash})\n`;
					}
					reportMessage += `... и еще ${successCount - 10} переводов\n`;
					reportMessage += `\n📋 Полный отчет можно получить, запросив команду /withdrawal_report\n\n`;
				}
			}
			
			if (errorCount > 0) {
				reportMessage += `\n❌ Неудачные переводы: ${errorCount}\n`;
				
				// Добавляем только первые 20 ошибок с классификацией
				if (errorCount <= 20) {
					// Если ошибок немного, показываем все
					let i = 0;
					for (const [address, error] of failedTransfers.entries()) {
						reportMessage += `${++i}. ${address}: ${error}\n`;
					}
				} else {
					// Иначе показываем только первые несколько и группировку по типам ошибок
					
					// Группируем ошибки по типу
					const errorTypes = new Map<string, number>();
					for (const error of failedTransfers.values()) {
						const count = errorTypes.get(error) || 0;
						errorTypes.set(error, count + 1);
					}
					
					// Показываем статистику ошибок
					reportMessage += `Распределение ошибок по типам:\n`;
					for (const [errorType, count] of errorTypes.entries()) {
						reportMessage += `• ${errorType}: ${count} кошельков\n`;
					}
					
					reportMessage += `\n📋 Полный отчет можно получить, запросив команду /withdrawal_errors\n`;
				}
			}
			
			// Сохраняем результаты в глобальной переменной для использования в отчетах
			withdrawalResults = {
				successfulTransfers: Object.fromEntries(successfulTransfers),
				failedTransfers: Object.fromEntries(failedTransfers),
				totalProcessed: walletsWithBalance.length,
				successCount,
				errorCount,
				totalTransferred,
				timestamp: new Date().toISOString()
			};
			
			return reportMessage;
		};
		
		// Отправляем итоговый отчет
		const finalReport = generateFinalReport();
		await ctx.telegram.editMessageText(
			ctx.chat!.id,
			messageId,
			undefined,
			finalReport
		);

	} catch (err) {
		console.error('Критическая ошибка в процессе перевода:', err);

		// Уведомляем пользователя о сбое
		await ctx.telegram.editMessageText(
			ctx.chat!.id,
			messageId,
			undefined,
			`❌ Произошла критическая ошибка при переводе средств: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}\n\nПожалуйста, проверьте логи системы и повторите попытку позже.`
		);
	} finally {
		// Сбрасываем флаг после завершения процесса
		isProcessRunning = false;
	}
};

// Глобальная переменная для хранения результатов последней операции вывода
let withdrawalResults: {
	successfulTransfers: Record<string, { amount: number; txHash: string }>;
	failedTransfers: Record<string, string>;
	totalProcessed: number;
	successCount: number;
	errorCount: number;
	totalTransferred: number;
	timestamp: string;
} | null = null;

/**
 * Обработка отдельного кошелька
 */
async function processWallet(
	wallet: Wallet, 
	masterAddress: string,
	successfulTransfers: Map<string, { amount: number; txHash: string }>,
	failedTransfers: Map<string, string>
): Promise<{ success: boolean; amount?: number }> {
	try {
		const balanceFloat = parseFloat(wallet.balance.toString());
		
		// Проверяем наличие UTXO перед созданием транзакции
		const hasUtxo = await checkUtxoAvailability(wallet.address);
		if (!hasUtxo) {
			failedTransfers.set(wallet.address, "Нет доступных UTXO для данного адреса");
			return { success: false };
		}

		// Создаем транзакцию с небольшой комиссией (0.5%)
		const feePercentage = 0.5; // 0.5% комиссия для обеспечения быстрого подтверждения
		const txHash = await createTransaction(
			wallet.wif,
			balanceFloat,
			masterAddress,
			feePercentage
		);

		// Проверяем, что хеш транзакции не null/undefined
		if (!txHash) {
			failedTransfers.set(wallet.address, "Не удалось создать транзакцию (пустой хеш)");
			return { success: false };
		}

		// Отправляем транзакцию
		const broadcastResult = await sendTransaction(txHash);
		
		// Проверяем успешность отправки
		if (broadcastResult === null || broadcastResult === undefined) {
			failedTransfers.set(wallet.address, "Ошибка при отправке транзакции в сеть");
			return { success: false };
		}

		// Записываем успешную транзакцию
		successfulTransfers.set(wallet.address, {
			amount: balanceFloat,
			txHash: typeof broadcastResult === 'string' ? broadcastResult : 'unknown'
		});

		// Добавляем небольшую паузу между транзакциями для предотвращения бана API
		await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
		
		return { success: true, amount: balanceFloat };
	} catch (error) {
		// Обрабатываем ошибку для конкретного кошелька
		const errorMessage = error instanceof Error ? error.message : String(error);
		failedTransfers.set(wallet.address, errorMessage);
		console.error(`Ошибка при обработке кошелька ${wallet.address}:`, error);
		return { success: false };
	}
}

/**
 * Функция для обработки пакета с ограничением количества одновременных запросов
 */
async function processBatchWithRateLimit<T>(promises: Promise<T>[], concurrencyLimit: number): Promise<T[]> {
	const results: T[] = [];
	const running = new Set<Promise<T>>();
	
	// Создаем копию массива промисов
	const queue = [...promises];
	
	while (queue.length > 0 || running.size > 0) {
		// Заполняем пул активных промисов до лимита
		while (running.size < concurrencyLimit && queue.length > 0) {
			const promise = queue.shift()!;
			
			// Обработчик выполнения промиса
			const runPromise = promise.then(result => {
				running.delete(runPromise);
				return result;
			}).catch(error => {
				running.delete(runPromise);
				throw error;
			});
			
			running.add(runPromise);
			results.push(await runPromise);
		}
		
		// Если пул заполнен, ждем завершения хотя бы одного промиса
		if (running.size >= concurrencyLimit) {
			await Promise.race(running);
		}
	}
	
	return results;
}

/**
 * Функция для проверки наличия UTXO перед созданием транзакции
 */
async function checkUtxoAvailability(address: string): Promise<boolean> {
	try {
		// Для проверки можно использовать API Blockchain.info или другие
		const response = await fetch(`https://blockchain.info/unspent?active=${address}`);
		
		// Если запрос успешен и содержит UTXO
		if (response.ok) {
			const data = await response.json();
			
			// Проверяем наличие UTXO
			return data && 
				data.unspent_outputs && 
				Array.isArray(data.unspent_outputs) && 
				data.unspent_outputs.length > 0;
		}
		
		return false;
	} catch (error) {
		console.error(`Ошибка при проверке UTXO для ${address}:`, error);
		return false;
	}
}
