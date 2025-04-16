import axios from 'axios';
// @ts-ignore - проигнорируем ошибки типизации для AxiosInstance и других типов
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { logInfo, logError } from '@/core/logs/logger';

/**
 * Добавляет перехватчики для логирования запросов и ответов axios
 * @param instance Экземпляр axios
 * @param name Название сервиса для логирования
 * @returns Настроенный экземпляр axios
 */
export function setupAxiosLogging(instance: any = axios, name: string = 'api'): any {
  // Перехватчик запросов
  instance.interceptors.request.use(
    (config: any) => {
      const { method, url, params, data } = config;
      
      // Маскируем чувствительные данные, если они есть
      const sanitizedData = sanitizeData(data);
      const sanitizedParams = sanitizeData(params);
      
      // Логируем запрос
      logInfo(`📤 HTTP запрос: ${method?.toUpperCase()} ${url}`, {
        service: name,
        method: method?.toUpperCase(),
        url,
        params: sanitizedParams,
        data: sanitizedData
      });
      
      return config;
    },
    (error: any) => {
      logError(`❌ Ошибка при подготовке запроса: ${error.message}`, {
        service: name,
        error: error.message,
        stack: error.stack
      });
      
      return Promise.reject(error);
    }
  );
  
  // Перехватчик ответов
  instance.interceptors.response.use(
    (response: any) => {
      const { status, config, data } = response;
      const { method, url } = config;
      
      // Логируем успешный ответ
      logInfo(`📥 HTTP ответ: ${status} ${method?.toUpperCase()} ${url}`, {
        service: name,
        status,
        method: method?.toUpperCase(),
        url,
        responseSize: JSON.stringify(data).length,
        responseTime: response.headers['x-response-time'] || 'N/A',
      });
      
      return response;
    },
    (error: any) => {
      // Извлекаем данные для логирования
      const { config, response } = error;
      const status = response?.status || 'unknown';
      const method = config?.method?.toUpperCase() || 'unknown';
      const url = config?.url || 'unknown';
      
      // Логируем ошибку
      logError(`❌ HTTP ошибка: ${status} ${method} ${url} - ${error.message}`, {
        service: name,
        status,
        method,
        url,
        errorCode: error.code,
        errorMessage: error.message,
        responseData: response?.data,
        stack: error.stack
      });
      
      return Promise.reject(error);
    }
  );
  
  return instance;
}

/**
 * Создает экземпляр axios с настроенным логированием
 * @param baseURL Базовый URL для запросов
 * @param name Название сервиса для логирования
 * @returns Настроенный экземпляр axios
 */
export function createLoggingAxios(baseURL: string, name: string): any {
  const instance = axios.create({
    baseURL,
    timeout: 10000,
  });
  
  return setupAxiosLogging(instance, name);
}

/**
 * Маскирует чувствительные данные в объекте
 * @param data Объект с данными
 * @returns Объект с замаскированными чувствительными данными
 */
function sanitizeData(data: any): any {
  if (!data) return data;
  
  // Клонируем данные
  const clonedData = { ...data };
  
  // Список чувствительных полей, которые нужно маскировать
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'apiKey', 'api_key', 
    'privateKey', 'private_key', 'wif', 'seed', 'mnemonic',
    'passphrase', 'pin', 'auth', 'authorization'
  ];
  
  // Маскируем чувствительные поля
  Object.keys(clonedData).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      clonedData[key] = '***MASKED***';
    } else if (typeof clonedData[key] === 'object' && clonedData[key] !== null) {
      clonedData[key] = sanitizeData(clonedData[key]);
    }
  });
  
  return clonedData;
} 