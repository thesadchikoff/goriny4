import * as crypto from 'crypto'
import {prisma} from "@/prisma/prisma.client";

// Функция для генерации уникального логина
export async function generateUsername() {
    let isUnique = false;
    let login;

    while (!isUnique) {
        // Генерируем случайный набор символов
        const randomString = crypto.randomBytes(4).toString('hex').toUpperCase();
        login = `user_${randomString}`;

        // Проверяем, существует ли уже такой логин в базе данных
        const existingUser = await prisma.user.findFirst({
            where: {
                login
            }
        });

        if (!existingUser) {
            isUnique = true; // Логин уникальный
        }
    }

    return login;
}