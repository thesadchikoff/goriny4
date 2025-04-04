import {SceneContext} from "telegraf/typings/scenes";
import {Scenes} from "telegraf";

const CancelScene = async (ctx: Scenes.WizardContext) => {
    console.log(ctx.wizard);
    await ctx.answerCbQuery();  // Ответ на нажатие кнопки
    await ctx.scene.leave(); // Выход из сцены
    return ctx.reply('Вы вышли из процесса добавления адреса.');

};

export default CancelScene;
