import { Context, Scenes } from 'telegraf';

export const starsPaymentCommand = async (ctx: Context & { scene: Scenes.SceneContextScene<Context> }) => {
    await ctx.scene.enter('stars_payment');
}; 