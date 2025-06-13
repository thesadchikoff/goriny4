import { prisma } from '../prisma/prisma.client';

// Массив ID администраторов
export const ADMIN_IDS = ['360000840'];

// Оставляем для обратной совместимости, но не рекомендуется использовать
export const ADMIN_ID = ADMIN_IDS[0];

/**
 * Получает зашифрованный список ID администраторов
 * @deprecated Используйте массив ADMIN_IDS напрямую
 */
export const getHashedAdminId = (): string => {
    // Возвращаем строку с разделителями для всех админов, а не только первого
    return ADMIN_IDS.join(',');
};

/**
 * Получает расшифрованный список ID администраторов
 * @deprecated Используйте массив ADMIN_IDS напрямую
 */
export const getDecryptedAdminId = (): string => {
    // Возвращаем строку с разделителями для всех админов, а не только первого
    return ADMIN_IDS.join(',');
};

/**
 * Проверяет, является ли пользователь администратором
 * @param userId ID пользователя для проверки
 * @returns true, если пользователь является администратором
 */
export const isAdmin = (userId: string): boolean => {
    return ADMIN_IDS.includes(userId);
};

/**
 * Проверяет, является ли пользователь мастер-админом
 * @param userId ID пользователя для проверки
 * @returns true, если пользователь является мастер-админом
 */
export const isMasterAdmin = (userId: string): boolean => {
    return ADMIN_IDS.includes(userId);
};

/**
 * Определяет тип администратора для отображения
 * @param userId ID пользователя
 * @param isAdminFlag флаг isAdmin из базы данных
 * @returns Строка с типом администратора для отображения
 */
export const getAdminType = (userId: string, isAdminFlag: boolean): string => {
    // Если у пользователя нет флага isAdmin, то он обычный пользователь
    if (!isAdminFlag) {
        return '👤 Пользователь';
    }
    
    // Если ID пользователя есть в списке ADMIN_IDS, то он мастер-админ
    if (ADMIN_IDS.includes(userId)) {
        return '👑 System Admin';
    }
    
    // В остальных случаях - обычный администратор (с флагом isAdmin)
    return '👑 Администратор';
};

/**
 * Инициализирует всех администраторов в базе данных
 */
export const initAdmin = async () => {
    try {
        // Обновляем права для всех пользователей в списке администраторов
        for (const adminId of ADMIN_IDS) {
            const admin = await prisma.user.findUnique({
                where: { id: adminId }
            });

            if (admin) {
                await prisma.user.update({
                    where: {
                        id: adminId
                    },
                    data: {
                        isAdmin: true
                    }
                });
            }
        }
    } catch (error) {
        console.error('Ошибка при инициализации администраторов:', error);
    }
}; 