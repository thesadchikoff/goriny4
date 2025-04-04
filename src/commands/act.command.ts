import {SceneContext} from 'telegraf/typings/scenes'
import {Networks, PrivateKey} from "bitcore-lib";
import {createMasterWallet, createTransaction} from "@/trust-wallet/1";
import { getBitcoinBalance, BitcoinNetwork, BalanceApiType } from '@/trust-wallet/bitcoin-balance';

export const actCommand = (ctx: SceneContext) => {
    const privateKey = new PrivateKey("c5c4f88eab73c93f785647903e126fd42476ed94827eb056a4b006c3bc569f2f", Networks.testnet)
    
    // Пример использования новой функции получения баланса
    const testAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'; // Адрес первого блока (Сатоши Накамото)
    
    getBitcoinBalance(testAddress, BitcoinNetwork.MAINNET, BalanceApiType.BLOCKCHAIN_INFO)
        .then(balance => {
            console.log('Баланс адреса через blockchain.info:', balance.balance, 'BTC');
            console.log('Всего транзакций:', balance.txCount);
        })
        .catch(error => {
            console.error('Ошибка при получении баланса:', error.message);
        });
    
    const wif = 'L46ixenNSu8Bqk899ZrH8Y96t8DHqJ1ZyxzQBGFTbh38rLHLaPoY';
    const amount = 0.1; // Количество BTC для перевода
    const recipient = '17ya3bCpPioyPH8kAyFkEDBUqdjF6wwPxo'; // Кошелек получателя
    const fee = 2000; // Комиссия в сатоши

    createTransaction(wif, amount, recipient, fee)
        .then(txHash => {
            console.log('TX Hash:', txHash);
        })
        .catch(error => {
            console.error('Ошибка при создании транзакции:', error.message);
        });
    const key = createMasterWallet(0)
    return ctx.reply(`${key.address} | ${key.wif}`)
}
