import {Address, Networks} from 'bitcore-lib'
import axios from 'axios'
import { logError, logInfo, logDebug } from '@/core/logs/logger';
import { setupAxiosLogging } from '@/utils/axios-logger';

// Настраиваем логирование для axios
const axiosInstance = setupAxiosLogging(axios, 'blockchain-info');

// Функция для получения UTXO с использованием Blockstream API на Testnet
// @ts-ignore
export async function getUTXOs(address: Address, network = Networks.mainnet) {
	try {
		logDebug('Запрос UTXO для адреса', { address: address.toString(), network: network.name });
		const url = `https://blockchain.info/unspent?active=${address}`;
		const response = await axiosInstance.get(url);
		
		const utxos = response.data.unspent_outputs.map(utxo => ({
			txId: utxo.tx_hash_big_endian,
			outputIndex: utxo.tx_output_n,
			address: address,
			script: utxo.script,
			satoshis: utxo.value,
		}));
		
		logInfo('Получены UTXO для адреса', { 
			address: address.toString(), 
			network: network.name, 
			count: utxos.length,
			totalSatoshis: utxos.reduce((acc, curr) => acc + curr.satoshis, 0)
		});
		
		return utxos;
	} catch (error: any) {
		logError(`Ошибка при получении UTXO: ${error.message}`, {
			address: address.toString(),
			network: network.name,
			errorName: error.name,
			stack: error.stack
		});
		return [];
	}
}

// Функция для получения баланса кошелька
// @ts-ignore
export async function getWalletBalance(address) {
	try {
		logDebug('Запрос баланса для адреса', { address: address.toString() });
		
		const utxos = await getUTXOs(address)
		if (utxos.length === 0) {
			logInfo('Баланс равен 0, UTXO не найдены', { address: address.toString() });
			return 0 // Если нет UTXO, баланс равен 0
		}

		// Суммирование всех сатоши из UTXO
		const totalSatoshis = utxos.reduce(
			// @ts-ignore
			(total, utxo) => total + utxo.satoshis,
			0
		)
		// Форматирование в BTC
		const balanceBTC = totalSatoshis / 100000000 // Сатоши в одном BTC
		
		logInfo('Получен баланс кошелька', {
			address: address.toString(),
			balanceBTC,
			totalSatoshis,
			utxoCount: utxos.length
		});
		
		return balanceBTC // Баланс в BTC
	} catch (err: any) {
		logError(`Ошибка получения баланса: ${err.message}`, {
			address: address.toString(),
			errorName: err.name,
			stack: err.stack
		});
		console.error('Ошибка получения баланса:', err)
		return null // В случае ошибки вернуть null
	}
}
