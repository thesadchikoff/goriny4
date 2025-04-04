import {Address, Networks} from 'bitcore-lib'
import axios from 'axios'
import { logErrorWithAutoDetails } from '@/core/logs/log-error-to-file';

// Функция для получения UTXO с использованием Blockstream API на Testnet
// @ts-ignore
export async function getUTXOs(address: Address, network = Networks.mainnet) {
	try {
		const url = `https://blockchain.info/unspent?active=${address}`
		const response = await axios.get(url)
		return response.data.unspent_outputs.map(utxo => ({
			txId: utxo.tx_hash_big_endian,
			outputIndex: utxo.tx_output_n,
			address: address,
			script: utxo.script,
			satoshis: utxo.value,
		}))
	} catch (error) {
		logErrorWithAutoDetails(`Ошибка при получении UTXO: ${error.message}`, 'getUTXOs');
		console.error('Ошибка при получении UTXO:', error.message);
		return [];
	}
}

// Функция для получения баланса кошелька
// @ts-ignore
export async function getWalletBalance(address) {
	try {
		const utxos = await getUTXOs(address)
		if (utxos.length === 0) {
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
		return balanceBTC // Баланс в BTC
	} catch (err) {
		logErrorWithAutoDetails(`Ошибка получения баланса: ${err.message}`, 'getWalletBalance');
		console.error('Ошибка получения баланса:', err)
		return null // В случае ошибки вернуть null
	}
}
