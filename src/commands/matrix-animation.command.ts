import { Context } from 'telegraf'

export const matrixAnimation = async (ctx: Context) => {
    const message = "Bot is disconnected";
    const matrixChars = "01";
    
    // Генерируем начальную матрицу
    const generateMatrix = (length: number) => 
        Array(length).fill(0).map(() => matrixChars[Math.floor(Math.random() * matrixChars.length)]).join("");
    
    // Отправляем начальное сообщение
    const sentMessage = await ctx.reply("```\n" + generateMatrix(message.length) + "\n```", { parse_mode: "Markdown" });
    
    try {
        // Анимируем каждую букву
        for (let i = 0; i < message.length; i++) {
            // Матричный эффект для текущей позиции
            for (let j = 0; j < 2; j++) {
                const currentPart = message.slice(0, i);
                const randomChar = matrixChars[Math.floor(Math.random() * matrixChars.length)];
                const remainingPart = generateMatrix(message.length - i - 1);
                
                await ctx.telegram.editMessageText(
                    ctx.chat?.id,
                    sentMessage.message_id,
                    undefined,
                    "```\n" + currentPart + randomChar + remainingPart + "\n```",
                    { parse_mode: "Markdown" }
                );
                
                await new Promise(resolve => setTimeout(resolve, 30));
            }
            
            // Добавляем правильную букву
            const currentPart = message.slice(0, i + 1);
            const remainingPart = generateMatrix(message.length - i - 1);
            
            await ctx.telegram.editMessageText(
                ctx.chat?.id,
                sentMessage.message_id,
                undefined,
                "```\n" + currentPart + remainingPart + "\n```",
                { parse_mode: "Markdown" }
            );
            
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Финальная анимация
        for (let i = 0; i < 2; i++) {
            await ctx.telegram.editMessageText(
                ctx.chat?.id,
                sentMessage.message_id,
                undefined,
                "```\n" + generateMatrix(message.length) + "\n```",
                { parse_mode: "Markdown" }
            );
            
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Гарантированное финальное сообщение
        await ctx.telegram.editMessageText(
            ctx.chat?.id,
            sentMessage.message_id,
            undefined,
            "```\n" + message + "\n```",
            { parse_mode: "Markdown" }
        );
        
        // Дополнительная проверка финального состояния
        await new Promise(resolve => setTimeout(resolve, 100));
        await ctx.telegram.editMessageText(
            ctx.chat?.id,
            sentMessage.message_id,
            undefined,
            "```\n" + message + "\n```",
            { parse_mode: "Markdown" }
        );
    } catch (error) {
        console.error('Ошибка при выполнении анимации:', error);
        // В случае ошибки пытаемся отправить финальное сообщение
        try {
            await ctx.telegram.editMessageText(
                ctx.chat?.id,
                sentMessage.message_id,
                undefined,
                "```\n" + message + "\n```",
                { parse_mode: "Markdown" }
            );
        } catch (finalError) {
            console.error('Ошибка при отправке финального сообщения:', finalError);
        }
    }
}; 