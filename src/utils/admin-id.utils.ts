import crypto from 'crypto';
import { prisma } from '../prisma/prisma.client';

export const ADMIN_ID = '360000840';
const SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'your-secret-key-here';
const IV_LENGTH = 16; // Для AES это 16 байт

// Генерируем ключ правильной длины для AES-256 (32 байта)
const getKey = (): Buffer => {
    return crypto.scryptSync(SECRET_KEY, 'salt', 32);
};

export const getHashedAdminId = (): string => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey();
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(ADMIN_ID, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
};

export const getDecryptedAdminId = (): string => {
    const textParts = getHashedAdminId().split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const key = getKey();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};

export const isAdmin = (userId: string): boolean => {
    return userId === getDecryptedAdminId();
};

export const initAdmin = async () => {
    try {
        const admin = await prisma.user.findUnique({
            where: { id: ADMIN_ID }
        });

        if (!admin) {
            await prisma.user.create({
                data: {
                    id: ADMIN_ID,
                    username: 'admin',
                    isAdmin: true
                }
            });
        }
    } catch (error) {
        console.error('Ошибка при инициализации администратора:', error);
    }
}; 