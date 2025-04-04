import axios from 'axios';
import * as bitcore from 'bitcore-lib';
import { logErrorWithAutoDetails } from '@/core/logs/log-error-to-file';

/**
 * Типы сетей Биткоина
 */
export enum BitcoinNetwork {
  MAINNET = 'mainnet',
  TESTNET = 'testnet'
}

/**
 * Типы доступных API для получения баланса
 */
export enum BalanceApiType {
  BLOCKCHAIN_INFO = 'blockchain_info',
  BLOCKSTREAM = 'blockstream',
  BLOCKCYPHER = 'blockcypher'
}

/**
 * Интерфейс для UTXO (непотраченный выход)
 */
export interface Utxo {
  txId: string;
  outputIndex: number;
  address: string;
  script: string;
  satoshis: number;
}

/**
 * Интерфейсы для ответов API
 */
interface BlockchainInfoResponse {
  final_balance: number;
  total_received: number;
  total_sent: number;
  n_tx: number;
}

interface BlockstreamUtxoResponse {
  txid: string;
  vout: number;
  value: number;
}

interface BlockCypherResponse {
  balance: number;
  unconfirmed_balance: number;
  total_received: number;
  total_sent: number;
  n_tx: number;
}

/**
 * Интерфейс ответа с балансом
 */
export interface BalanceResponse {
  address: string;
  balance: number; // в BTC
  balanceSatoshi: number; // в сатоши
  unconfirmedBalance?: number; // в BTC (может отсутствовать в некоторых API)
  totalReceived?: number; // в BTC (может отсутствовать в некоторых API)
  totalSent?: number; // в BTC (может отсутствовать в некоторых API)
  txCount?: number; // количество транзакций (может отсутствовать в некоторых API)
  error?: string; // сообщение об ошибке, если что-то пошло не так
}

/**
 * Получение баланса биткоин-кошелька с использованием различных API
 * @param address - Адрес биткоин-кошелька
 * @param network - Сеть биткоина (mainnet или testnet)
 * @param apiType - Тип API для получения баланса
 * @returns Объект с информацией о балансе
 */
export async function getBitcoinBalance(
  address: string,
  network: BitcoinNetwork = BitcoinNetwork.MAINNET,
  apiType: BalanceApiType = BalanceApiType.BLOCKCHAIN_INFO
): Promise<BalanceResponse> {
  try {
    // Базовый результат
    const result: BalanceResponse = {
      address,
      balance: 0,
      balanceSatoshi: 0
    };

    // Выбор API в зависимости от параметра apiType
    switch (apiType) {
      case BalanceApiType.BLOCKCHAIN_INFO:
        return await getBalanceFromBlockchainInfo(address, result);
      
      case BalanceApiType.BLOCKSTREAM:
        return await getBalanceFromBlockstream(address, network, result);
      
      case BalanceApiType.BLOCKCYPHER:
        return await getBalanceFromBlockcypher(address, network, result);
      
      default:
        // По умолчанию используем blockchain.info
        return await getBalanceFromBlockchainInfo(address, result);
    }
  } catch (error: any) {
    logErrorWithAutoDetails(`Ошибка при получении баланса: ${error.message}`, 'getBitcoinBalance');
    return {
      address,
      balance: 0,
      balanceSatoshi: 0,
      error: `Ошибка при получении баланса: ${error.message}`
    };
  }
}

/**
 * Получение баланса через API blockchain.info
 * @param address - Адрес биткоин-кошелька
 * @param result - Объект с базовыми данными для заполнения
 * @returns Заполненный объект с балансом
 */
async function getBalanceFromBlockchainInfo(
  address: string,
  result: BalanceResponse
): Promise<BalanceResponse> {
  try {
    const url = `https://blockchain.info/rawaddr/${address}`;
    const response = await axios.get<BlockchainInfoResponse>(url);
    const data = response.data;
    
    // Преобразуем сатоши в BTC (1 BTC = 100,000,000 сатоши)
    result.balanceSatoshi = data.final_balance;
    result.balance = data.final_balance / 100000000;
    result.totalReceived = data.total_received / 100000000;
    result.totalSent = data.total_sent / 100000000;
    result.txCount = data.n_tx;
    
    return result;
  } catch (error: any) {
    logErrorWithAutoDetails(`Ошибка при получении баланса через blockchain.info: ${error.message}`, 'getBalanceFromBlockchainInfo');
    throw error;
  }
}

/**
 * Получение баланса через API blockstream.info
 * @param address - Адрес биткоин-кошелька
 * @param network - Сеть биткоина (mainnet или testnet)
 * @param result - Объект с базовыми данными для заполнения
 * @returns Заполненный объект с балансом
 */
async function getBalanceFromBlockstream(
  address: string,
  network: BitcoinNetwork,
  result: BalanceResponse
): Promise<BalanceResponse> {
  try {
    // Формируем URL в зависимости от сети
    const baseUrl = network === BitcoinNetwork.TESTNET 
      ? 'https://blockstream.info/testnet/api' 
      : 'https://blockstream.info/api';
    
    // Получаем UTXO (непотраченные выходы) для адреса
    const utxoUrl = `${baseUrl}/address/${address}/utxo`;
    const utxoResponse = await axios.get<BlockstreamUtxoResponse[]>(utxoUrl);
    const utxos = utxoResponse.data;
    
    // Суммируем значения всех UTXO
    let totalSatoshi = 0;
    if (utxos && utxos.length > 0) {
      totalSatoshi = utxos.reduce((sum: number, utxo) => sum + utxo.value, 0);
    }
    
    // Получаем информацию о транзакциях
    const txsUrl = `${baseUrl}/address/${address}/txs`;
    const txsResponse = await axios.get<any[]>(txsUrl);
    
    result.balanceSatoshi = totalSatoshi;
    result.balance = totalSatoshi / 100000000;
    result.txCount = txsResponse.data.length;
    
    return result;
  } catch (error: any) {
    logErrorWithAutoDetails(`Ошибка при получении баланса через blockstream.info: ${error.message}`, 'getBalanceFromBlockstream');
    throw error;
  }
}

/**
 * Получение баланса через API blockcypher.com
 * @param address - Адрес биткоин-кошелька
 * @param network - Сеть биткоина (mainnet или testnet)
 * @param result - Объект с базовыми данными для заполнения
 * @returns Заполненный объект с балансом
 */
async function getBalanceFromBlockcypher(
  address: string,
  network: BitcoinNetwork,
  result: BalanceResponse
): Promise<BalanceResponse> {
  try {
    // Формируем URL в зависимости от сети
    const chain = network === BitcoinNetwork.TESTNET ? 'btc/test3' : 'btc/main';
    const url = `https://api.blockcypher.com/v1/${chain}/addrs/${address}/balance`;
    
    const response = await axios.get<BlockCypherResponse>(url);
    const data = response.data;
    
    result.balanceSatoshi = data.balance;
    result.balance = data.balance / 100000000;
    result.unconfirmedBalance = data.unconfirmed_balance / 100000000;
    result.totalReceived = data.total_received / 100000000;
    result.totalSent = data.total_sent / 100000000;
    result.txCount = data.n_tx;
    
    return result;
  } catch (error: any) {
    logErrorWithAutoDetails(`Ошибка при получении баланса через blockcypher.com: ${error.message}`, 'getBalanceFromBlockcypher');
    throw error;
  }
}

/**
 * Получение баланса через UTXO
 * @param address - Адрес биткоин-кошелька
 * @param network - Сеть биткоина (mainnet или testnet)
 * @returns Объект с информацией о балансе
 */
export async function getBalanceFromUTXO(
  address: string,
  network: BitcoinNetwork = BitcoinNetwork.MAINNET
): Promise<BalanceResponse> {
  try {
    // Преобразуем строчное представление сети в объект Networks из bitcore-lib
    const bitcoreNetwork = network === BitcoinNetwork.TESTNET
      ? bitcore.Networks.testnet
      : bitcore.Networks.livenet;
    
    // Получаем UTXO
    const utxos = await getUTXOs(address, bitcoreNetwork);
    
    // Обрабатываем случай, когда UTXO нет
    if (!utxos || utxos.length === 0) {
      return {
        address,
        balance: 0,
        balanceSatoshi: 0
      };
    }
    
    // Суммируем все сатоши из UTXO
    const totalSatoshis = utxos.reduce((total: number, utxo: Utxo) => total + utxo.satoshis, 0);
    
    // Форматируем в BTC
    const balanceBTC = totalSatoshis / 100000000;
    
    return {
      address,
      balance: balanceBTC,
      balanceSatoshi: totalSatoshis
    };
  } catch (error: any) {
    logErrorWithAutoDetails(`Ошибка при получении баланса через UTXO: ${error.message}`, 'getBalanceFromUTXO');
    return {
      address,
      balance: 0,
      balanceSatoshi: 0,
      error: `Ошибка при получении баланса через UTXO: ${error.message}`
    };
  }
}

/**
 * Получение UTXO (непотраченных выходов) для адреса
 * @param address - Адрес биткоин-кошелька
 * @param network - Объект сети из bitcore-lib
 * @returns Массив UTXO
 */
async function getUTXOs(address: string, network: any): Promise<Utxo[]> {
  let url;
  
  if (network === bitcore.Networks.testnet) {
    url = `https://blockstream.info/testnet/api/address/${address}/utxo`;
  } else {
    url = `https://blockstream.info/api/address/${address}/utxo`;
  }
  
  const response = await axios.get<BlockstreamUtxoResponse[]>(url);
  
  return response.data.map((utxo) => ({
    txId: utxo.txid,
    outputIndex: utxo.vout,
    address: address,
    script: bitcore.Script.buildPublicKeyHashOut(new bitcore.Address(address)).toString(),
    satoshis: utxo.value // значение в сатоши
  }));
} 