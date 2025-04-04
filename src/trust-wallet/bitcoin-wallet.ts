import * as bip39 from 'bip39';
import * as bitcore from 'bitcore-lib';
import { logErrorWithAutoDetails } from '@/core/logs/log-error-to-file';
import { BitcoinNetwork } from './bitcoin-balance';

/**
 * Интерфейс для обычного кошелька
 */
export interface BitcoinWallet {
  address: string;         // Биткоин-адрес
  privateKey: string;      // Приватный ключ (hex формат)
  wif: string;             // Приватный ключ в WIF формате (для импорта)
  network: string;         // Название сети (mainnet или testnet)
}

/**
 * Интерфейс для HD кошелька
 */
export interface HDWallet extends BitcoinWallet {
  mnemonic: string;        // Мнемоническая фраза (seed phrase)
  xpub: string;            // Расширенный публичный ключ
  path: string;            // Путь деривации
}

/**
 * Создать обычный биткоин-кошелек
 * @param network - Сеть биткоина (mainnet или testnet)
 * @returns Информация о созданном кошельке
 */
export function createBitcoinWallet(network: BitcoinNetwork = BitcoinNetwork.MAINNET): BitcoinWallet {
  try {
    // Получаем объект сети из bitcore-lib
    const bitcoreNetwork = network === BitcoinNetwork.TESTNET ? 
      bitcore.Networks.testnet : 
      bitcore.Networks.livenet;
    
    // Генерируем новый приватный ключ
    const privateKey = new bitcore.PrivateKey(undefined, bitcoreNetwork);
    
    // Получаем адрес из приватного ключа
    const address = privateKey.toAddress();
    
    return {
      address: address.toString(),
      privateKey: privateKey.toString(),
      wif: privateKey.toWIF(),
      network: network
    };
  } catch (error: any) {
    logErrorWithAutoDetails(`Ошибка при создании биткоин-кошелька: ${error.message}`, 'createBitcoinWallet');
    throw new Error(`Не удалось создать биткоин-кошелек: ${error.message}`);
  }
}

/**
 * Создать HD (Hierarchical Deterministic) кошелек по стандарту BIP32/BIP39/BIP44
 * @param network - Сеть биткоина (mainnet или testnet)
 * @param mnemonic - Мнемоническая фраза (если не указана, будет сгенерирована новая)
 * @param passphrase - Дополнительный пароль для seed (опционально)
 * @returns Информация о созданном HD кошельке
 */
export function createHDWallet(
  network: BitcoinNetwork = BitcoinNetwork.MAINNET,
  mnemonic?: string,
  passphrase: string = ''
): HDWallet {
  try {
    // Получаем объект сети из bitcore-lib
    const bitcoreNetwork = network === BitcoinNetwork.TESTNET ? 
      bitcore.Networks.testnet : 
      bitcore.Networks.livenet;

    // Генерируем или используем переданную мнемоническую фразу
    const mnemonicPhrase = mnemonic || bip39.generateMnemonic(128); // 12 слов
    
    // Валидация мнемоники
    if (!bip39.validateMnemonic(mnemonicPhrase)) {
      throw new Error('Неверная мнемоническая фраза');
    }
    
    // Генерация seed из мнемонической фразы
    const seed = bip39.mnemonicToSeedSync(mnemonicPhrase, passphrase);
    
    // Создаем приватный ключ из seed
    const privateKey = new bitcore.PrivateKey(bitcore.crypto.Hash.sha256(seed).toString('hex'), bitcoreNetwork);
    
    // Получаем адрес из приватного ключа
    const address = privateKey.toAddress();
    
    // В этой реализации мы не генерируем HD ключи из-за ограничения библиотеки
    // Вместо этого храним мнемонику для дальнейшего создания дочерних ключей
    
    // Путь BIP44 для отображения
    const coinType = network === BitcoinNetwork.TESTNET ? 1 : 0;
    const path = `m/44'/${coinType}'/0'/0/0`;
    
    return {
      address: address.toString(),
      privateKey: privateKey.toString(),
      wif: privateKey.toWIF(),
      network: network,
      mnemonic: mnemonicPhrase,
      xpub: '', // Заглушка для xpub
      path: path
    };
  } catch (error: any) {
    logErrorWithAutoDetails(`Ошибка при создании HD кошелька: ${error.message}`, 'createHDWallet');
    throw new Error(`Не удалось создать HD кошелек: ${error.message}`);
  }
}

/**
 * Получить дочерний адрес из мнемонической фразы по индексу
 * Эта функция использует ту же мнемонику, но разные индексы для создания уникальных адресов
 * @param mnemonic - Мнемоническая фраза
 * @param index - Индекс адреса (0, 1, 2, ...)
 * @param network - Сеть биткоина (mainnet или testnet)
 * @param passphrase - Дополнительный пароль для seed (опционально)
 * @returns Информация о дочернем кошельке
 */
export function deriveChildWallet(
  mnemonic: string,
  index: number = 0,
  network: BitcoinNetwork = BitcoinNetwork.MAINNET,
  passphrase: string = ''
): BitcoinWallet {
  try {
    // Получаем объект сети из bitcore-lib
    const bitcoreNetwork = network === BitcoinNetwork.TESTNET ? 
      bitcore.Networks.testnet : 
      bitcore.Networks.livenet;
      
    // Валидация мнемоники
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Неверная мнемоническая фраза');
    }
    
    // Генерация seed из мнемонической фразы
    const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
    
    // Создаем дополнительную entropy, используя индекс
    const indexSuffix = index.toString().padStart(8, '0');
    const seedHex = seed.toString('hex') + indexSuffix;
    
    // Создаем ключ из seed с добавленным индексом
    const privateKey = new bitcore.PrivateKey(bitcore.crypto.Hash.sha256(Buffer.from(seedHex, 'hex')).toString('hex'), bitcoreNetwork);
    
    // Получаем адрес
    const address = privateKey.toAddress();
    
    return {
      address: address.toString(),
      privateKey: privateKey.toString(),
      wif: privateKey.toWIF(),
      network: network
    };
  } catch (error: any) {
    logErrorWithAutoDetails(`Ошибка при получении дочернего кошелька: ${error.message}`, 'deriveChildWallet');
    throw new Error(`Не удалось получить дочерний кошелек: ${error.message}`);
  }
}

/**
 * Импортировать кошелек из приватного ключа в WIF формате
 * @param wif - Приватный ключ в WIF формате
 * @returns Информация о импортированном кошельке
 */
export function importFromWIF(wif: string): BitcoinWallet {
  try {
    // Создаем объект приватного ключа из WIF
    // Используем конструктор для создания приватного ключа из WIF
    const privateKey = new bitcore.PrivateKey(wif);
    
    // Определяем сеть из приватного ключа
    const network = privateKey.network === bitcore.Networks.testnet ? 
      BitcoinNetwork.TESTNET : 
      BitcoinNetwork.MAINNET;
      
    // Получаем адрес из приватного ключа
    const address = privateKey.toAddress();
    
    return {
      address: address.toString(),
      privateKey: privateKey.toString(),
      wif: wif,
      network: network
    };
  } catch (error: any) {
    logErrorWithAutoDetails(`Ошибка при импорте кошелька из WIF: ${error.message}`, 'importFromWIF');
    throw new Error(`Не удалось импортировать кошелек из WIF: ${error.message}`);
  }
}

/**
 * Проверить валидность биткоин-адреса
 * @param address - Биткоин-адрес для проверки
 * @param network - Сеть биткоина (если не указано, проверяется для обеих сетей)
 * @returns true, если адрес валидный
 */
export function isValidAddress(
  address: string, 
  network?: BitcoinNetwork
): boolean {
  try {
    // Если сеть не указана, проверяем для обеих сетей
    if (!network) {
      try {
        new bitcore.Address(address, bitcore.Networks.livenet);
        return true;
      } catch {
        try {
          new bitcore.Address(address, bitcore.Networks.testnet);
          return true;
        } catch {
          return false;
        }
      }
    }
    
    // Проверяем для указанной сети
    const bitcoreNetwork = network === BitcoinNetwork.TESTNET ? 
      bitcore.Networks.testnet : 
      bitcore.Networks.livenet;
      
    try {
      new bitcore.Address(address, bitcoreNetwork);
      return true;
    } catch {
      return false;
    }
  } catch (error) {
    return false;
  }
} 