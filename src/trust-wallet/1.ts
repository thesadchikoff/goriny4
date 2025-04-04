import {Address, HDPrivateKey, Networks, PrivateKey, Transaction} from 'bitcore-lib'
// @ts-ignore
import * as Mnemonic from 'bitcore-mnemonic'
import * as bip39 from 'bip39'
import axios from "axios";
import {logErrorWithAutoDetails} from "@/core/logs/log-error-to-file";

export const createWallet = (network = Networks.mainnet) => {
	let privateKey = new PrivateKey(network.name)
	let address = privateKey.toAddress()
	let net = privateKey

	return {
		privateKey: privateKey.toString(),
		address: address.toString(),
		network: net,
	}
}

export async function sendTransaction(txHash) {
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

export async function createTransaction(wif: string, amountInBtc: number, recipientAddress: string, fee: number) {
	try {
		// Создаем приватный ключ из WIF
		const privateKey = PrivateKey.fromWIF(wif);

		// Получаем адрес из приватного ключа
		const fromAddress = privateKey.toAddress();

		// Получаем UTXO (непотраченные выходы) для адреса
		const url = `https://blockchain.info/unspent?active=${fromAddress}`;
		const response = await axios.get(url);

		// Проверяем наличие UTXO
		const utxos = response.data.unspent_outputs;
		if (!utxos || utxos.length === 0) {
			logErrorWithAutoDetails(`Нет доступных UTXO для данного адреса.`, 'createTransaction');
			console.error('Нет доступных UTXO для данного адреса.');
		}

		// Создаем транзакцию
		const transaction = new Transaction();

		// Добавляем входы
		transaction.from(utxos);
		const amountInSatoshi = Math.floor(amountInBtc * 1e8)
		// Добавляем выходы
		transaction.to(recipientAddress, amountInSatoshi); // Указываем сумму в сатоши (1 BTC = 1e8 сатоши)

		// Устанавливаем комиссию
		transaction.fee(fee);

		// Подписываем транзакцию
		transaction.sign(privateKey);

		// Возвращаем хэш транзакции
		return transaction.serialize();
	} catch (error) {
		logErrorWithAutoDetails(`Ошибка при создании транзакции:${error.message}`, 'createTransaction');
		console.error('Ошибка при создании транзакции:', error.message);
	}
}

export const getBalance = async (wallet: string) => {

	const url = `https://blockchain.info/rawaddr/${wallet}`;

	const {data} = await axios.get(url)
	return {
		finalBalance: data.final_balance,
		txs: data.txs,
		totalReceived: data.total_received,
	}
}

export const createMasterWallet = (index: number, network = Networks.mainnet) => {
	// Наша seed фраза
	const seed = 'rate total lottery reflect ramp iron echo cost update shove valve route';

	// Генерация seed из мнемонической фразы
	const seedBuffer = bip39.mnemonicToSeedSync(seed);

	// Создание мастер-ключа
	const hdPrivateKey = HDPrivateKey.fromSeed(seedBuffer, network);

	// Путь к корневому публичному ключу по пути 'm/44'/0'/0'/0'
	const derivedPublicKey = hdPrivateKey.derive("m/44'/0'/0'/0").hdPublicKey;

	// Получаем дочерний адрес на основе индекса
	const childPublicKey = derivedPublicKey.deriveChild(index);
	const address = new Address(childPublicKey.publicKey, network);

	// WIF (Wallet Import Format) приватного ключа дочернего кошелька
	const childPrivateKey = hdPrivateKey.derive(`m/44'/0'/0'/0/${index}`);
	const wif = childPrivateKey.privateKey.toWIF();

	return {
		address: address.toString(),
		wif: wif
	};
}

// Mainnet Address: 1FSoWv6QDAQfSuLdWCxKqzGg6F8vHTyn6c
// console.log(createWallet())

export const createHDWallet = (network = Networks.mainnet) => {
	let passPhrase = new Mnemonic(Mnemonic.Words.ENGLISH)
	let xpriv = passPhrase.toHDPrivateKey(passPhrase.toString(), network)
	return {
		xpub: xpriv.xpubkey,
		privateKey: xpriv.privateKey.toString(),
		address: xpriv.publicKey.toAddress().toString(),
		mnemonic: passPhrase.toString(),
	}
}
