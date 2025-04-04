import { 
  createBitcoinWallet, 
  createHDWallet, 
  deriveChildWallet, 
  importFromWIF,
  isValidAddress,
  BitcoinWallet,
  HDWallet
} from '../bitcoin-wallet';
import { BitcoinNetwork, getBitcoinBalance, BalanceApiType } from '../bitcoin-balance';
import { logErrorWithAutoDetails } from '@/core/logs/log-error-to-file';

/**
 * Пример использования методов для создания и работы с биткоин-кошельками
 */
async function bitcoinWalletExample() {
  try {
    console.log('=== Примеры создания и работы с биткоин-кошельками ===\n');

    // Пример 1: Создание обычного биткоин-кошелька
    console.log('Пример 1: Создание обычного биткоин-кошелька');
    const wallet1 = createBitcoinWallet(BitcoinNetwork.MAINNET);
    console.log('Кошелек в основной сети:');
    printWalletInfo(wallet1);

    const wallet2 = createBitcoinWallet(BitcoinNetwork.MAINNET);
    console.log('Кошелек в основной сети:');
    printWalletInfo(wallet2);
    console.log('---\n');

    // Пример 2: Создание HD кошелька
    console.log('Пример 2: Создание HD кошелька');
    const hdWallet1 = createHDWallet(BitcoinNetwork.MAINNET);
    console.log('HD кошелек с автоматически сгенерированной мнемоникой:');
    printHDWalletInfo(hdWallet1);
    console.log('---\n');

    // Пример 3: Создание HD кошелька с указанной мнемоникой
    console.log('Пример 3: Создание HD кошелька с указанной мнемоникой');
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hdWallet2 = createHDWallet(BitcoinNetwork.MAINNET, mnemonic);
    console.log('HD кошелек с указанной мнемоникой:');
    printHDWalletInfo(hdWallet2);
    console.log('---\n');

    // Пример 4: Получение дочерних кошельков из одной мнемоники
    console.log('Пример 4: Получение дочерних кошельков из одной мнемоники');
    const childWallet1 = deriveChildWallet(mnemonic, 0, BitcoinNetwork.MAINNET);
    const childWallet2 = deriveChildWallet(mnemonic, 1, BitcoinNetwork.MAINNET);
    const childWallet3 = deriveChildWallet(mnemonic, 2, BitcoinNetwork.MAINNET);
    
    console.log('Дочерний кошелек #0:');
    printWalletInfo(childWallet1);
    console.log('Дочерний кошелек #1:');
    printWalletInfo(childWallet2);
    console.log('Дочерний кошелек #2:');
    printWalletInfo(childWallet3);
    console.log('---\n');

    // Пример 5: Импорт кошелька из WIF
    console.log('Пример 5: Импорт кошелька из WIF');
    const importedWallet = importFromWIF(wallet1.wif);
    console.log('Импортированный кошелек:');
    printWalletInfo(importedWallet);
    console.log('Совпадает с оригинальным:', wallet1.address === importedWallet.address);
    console.log('---\n');

    // Пример 6: Проверка валидности адреса
    console.log('Пример 6: Проверка валидности адреса');
    const validAddressMainnet = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    const validAddressTestnet = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';
    const invalidAddress = 'invalid-address';
    
    console.log(`Адрес ${validAddressMainnet} валидный:`, 
      isValidAddress(validAddressMainnet, BitcoinNetwork.MAINNET));
    console.log(`Адрес ${validAddressTestnet} валидный:`, 
      isValidAddress(validAddressTestnet, BitcoinNetwork.MAINNET));
    console.log(`Адрес ${invalidAddress} валидный:`, 
      isValidAddress(invalidAddress));
    console.log('---\n');

    // Пример 7: Получение баланса адреса
    console.log('Пример 7: Получение баланса адреса');
    const balanceInfo = await getBitcoinBalance(
      '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 
      BitcoinNetwork.MAINNET, 
      BalanceApiType.BLOCKCHAIN_INFO
    );
    
    console.log('Информация о балансе:');
    console.log(`Адрес: ${balanceInfo.address}`);
    console.log(`Баланс: ${balanceInfo.balance} BTC (${balanceInfo.balanceSatoshi} сатоши)`);
    if (balanceInfo.txCount !== undefined) {
      console.log(`Количество транзакций: ${balanceInfo.txCount}`);
    }
    if (balanceInfo.totalReceived !== undefined) {
      console.log(`Всего получено: ${balanceInfo.totalReceived} BTC`);
    }
    if (balanceInfo.totalSent !== undefined) {
      console.log(`Всего отправлено: ${balanceInfo.totalSent} BTC`);
    }
    console.log('---\n');

    console.log('Пример успешно выполнен!');
  } catch (error) {
    logErrorWithAutoDetails(`Ошибка при выполнении примера: ${error.message}`, 'bitcoinWalletExample');
    console.error('Ошибка при выполнении примера:', error);
  }
}

/**
 * Вспомогательные функции для вывода информации
 */
function printWalletInfo(wallet: BitcoinWallet) {
  console.log(`Адрес: ${wallet.address}`);
  console.log(`Приватный ключ (hex): ${wallet.privateKey}`);
  console.log(`Приватный ключ (WIF): ${wallet.wif}`);
  console.log(`Сеть: ${wallet.network}`);
}

function printHDWalletInfo(wallet: HDWallet) {
  printWalletInfo(wallet);
  console.log(`Мнемоника: ${wallet.mnemonic}`);
  console.log(`XPub: ${wallet.xpub}`);
  console.log(`Путь: ${wallet.path}`);
}

// Запуск примера
bitcoinWalletExample();

/**
 * Как использовать методы создания кошелька в вашем коде:
 * 
 * 1. Создание обычного кошелька:
 * ```typescript
 * import { createBitcoinWallet, BitcoinNetwork } from '@/trust-wallet/bitcoin-wallet';
 * 
 * // Создаем кошелек в основной сети (mainnet)
 * const wallet = createBitcoinWallet(BitcoinNetwork.MAINNET);
 * console.log('Адрес:', wallet.address);
 * console.log('Приватный ключ (WIF):', wallet.wif);
 * ```
 * 
 * 2. Создание HD кошелька:
 * ```typescript
 * import { createHDWallet, BitcoinNetwork } from '@/trust-wallet/bitcoin-wallet';
 * 
 * // Создаем HD кошелек с автоматической генерацией мнемонической фразы
 * const hdWallet = createHDWallet(BitcoinNetwork.MAINNET);
 * console.log('Адрес:', hdWallet.address);
 * console.log('Мнемоническая фраза:', hdWallet.mnemonic);
 * 
 * // Создаем HD кошелек с указанной мнемонической фразой
 * const existingMnemonic = 'arch air canvas term anchor giraffe fortune calm cruise snap car fuel';
 * const hdWalletFromMnemonic = createHDWallet(BitcoinNetwork.MAINNET, existingMnemonic);
 * ```
 * 
 * 3. Создание дочерних кошельков из HD кошелька:
 * ```typescript
 * import { deriveChildWallet, BitcoinNetwork } from '@/trust-wallet/bitcoin-wallet';
 * 
 * const mnemonic = 'arch air canvas term anchor giraffe fortune calm cruise snap car fuel';
 * 
 * // Получаем несколько кошельков из одной мнемонической фразы
 * const wallet0 = deriveChildWallet(mnemonic, 0); // первый кошелек (индекс 0)
 * const wallet1 = deriveChildWallet(mnemonic, 1); // второй кошелек (индекс 1)
 * const wallet2 = deriveChildWallet(mnemonic, 2); // третий кошелек (индекс 2)
 * ```
 * 
 * 4. Импорт кошелька из WIF:
 * ```typescript
 * import { importFromWIF } from '@/trust-wallet/bitcoin-wallet';
 * 
 * const wif = 'L1aW4aubDFB7yfras2S1mN3bqg9nwySY8nkoLmJebSLD5BWv3ENZ';
 * const wallet = importFromWIF(wif);
 * console.log('Импортированный адрес:', wallet.address);
 * ```
 * 
 * 5. Проверка валидности адреса:
 * ```typescript
 * import { isValidAddress, BitcoinNetwork } from '@/trust-wallet/bitcoin-wallet';
 * 
 * const address = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
 * const isValid = isValidAddress(address, BitcoinNetwork.MAINNET);
 * console.log('Адрес валиден:', isValid);
 * ```
 * 
 * 6. Получение баланса кошелька:
 * ```typescript
 * import { getBitcoinBalance, BitcoinNetwork, BalanceApiType } from '@/trust-wallet/bitcoin-balance';
 * 
 * const address = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
 * 
 * // Получение баланса через blockchain.info API
 * const balance = await getBitcoinBalance(address, BitcoinNetwork.MAINNET, BalanceApiType.BLOCKCHAIN_INFO);
 * console.log('Баланс:', balance.balance, 'BTC');
 * console.log('Всего получено:', balance.totalReceived, 'BTC');
 * console.log('Всего отправлено:', balance.totalSent, 'BTC');
 * console.log('Количество транзакций:', balance.txCount);
 * ```
 */ 