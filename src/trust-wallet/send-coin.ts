import {Address, Networks, PrivateKey, Transaction} from 'bitcore-lib'
import {logErrorWithAutoDetails} from "@/core/logs/log-error-to-file";
import axios from "axios";
import {bot} from '../config/bot';
import {prisma} from '../prisma/prisma.client';

export const sendCoin = async (
	telegramId: number,
	recipientAddress: string,
	amountToSend: number,
	network = Networks.testnet
) => {
	const user = await prisma.user.findFirst({
		where: {
			id: telegramId.toString(),
		},
		include: {
			wallet: true,
		},
	});

	const privateKey = user?.wallet?.privateKey;
	const sourceAddress = user?.wallet?.address;
	const satoshiToSend = amountToSend * 100000000;
	const satoshisPerByte = 10; // Реалистичное значение для тестнета
	let fee = 0;

	// Функция для получения UTXO
	async function getUTXOs(address: Address) {
		const url = `https://blockstream.info/testnet/api/address/${address}/utxo`;
		const response = await axios.get(url);
		return response.data.map((utxo: any) => {
			console.log({
				txId: utxo.txid,
				outputIndex: utxo.vout,
				address: address,
				script: Script.buildPublicKeyHashOut(address).toString(),
				satoshis: 5555,
			})
			return {
				txId: utxo.txid,
				outputIndex: utxo.vout,
				address: address,
				script: Script.buildPublicKeyHashOut(address).toString(),
				satoshis: utxo.value,
			}
		});
	}

	// Функция для отправки транзакции
	async function broadcastTransaction(serializedTx: any) {
		const url = 'https://blockstream.info/testnet/api/tx';
		const response = await axios.post(url, serializedTx, {
			headers: { 'Content-Type': 'text/plain' },
		});
		console.log(response);
		return response.data;
	}

	async function sendBTC() {
		try {
			if (!sourceAddress || !privateKey) {
				throw new Error('Адрес отправителя или приватный ключ отсутствуют');
			}
			const utxos = await getUTXOs(sourceAddress);
			if (utxos.length === 0) {
				return bot.telegram.sendMessage(
					360000840,
					'⚠️ <b>Перевод не выполнен</b>\n\nUTXO записи не обнаружены, вероятнее всего, баланс на вашем кошельке отсутствует',
					{ parse_mode: 'HTML' }
				);
			}

			// Создаем транзакцию
			const tx = new Transaction().from(utxos).to(recipientAddress, satoshiToSend).change(sourceAddress);

			// Оценка размера транзакции и установка комиссии
			const estimatedSize = tx._estimateSize();
			fee = estimatedSize * satoshisPerByte;
			tx.fee(fee).sign(privateKey);


			// Отправка транзакции
			const serializedTx = tx.serialize();
			const txid = await broadcastTransaction(serializedTx);
			console.log(`Транзакция успешно отправлена. TXID: ${txid}`);
			return bot.telegram.sendMessage(
				360000840,
				`✅ <b>Перевод выполнен</b>\n\nТранзакция успешно отправлена. TXID операции: ${txid}`,
				{ parse_mode: 'HTML' }
			);
		} catch (err) {
			console.error(err);
			return bot.telegram.sendMessage(
				360000840,
				`⛔️ <b>Ошибка перевода</b>\n\nТранзакция совершилась с ошибкой: ${err.message}`,
				{ parse_mode: 'HTML' }
			);
		}
	}

	await sendBTC();
};

async function sendTransaction(txHash) {
	try {
		const url = 'https://blockchain.info/pushtx'; // URL для отправки транзакции
		const response = await axios.post(url, `tx=${txHash}`, {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		});
		console.log('Транзакция отправлена:', response.data);
	} catch (error) {
		logErrorWithAutoDetails(`Ошибка при отправке транзакции: ${error.message}`, 'sendTransaction');
		console.error('Ошибка при отправке транзакции:', error.message);
	}
}

