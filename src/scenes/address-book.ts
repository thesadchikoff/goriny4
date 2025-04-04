import { previousButton } from '@/keyboards/inline-keyboards/previous-button.inline'
import { prisma } from '@/prisma/prisma.client'
import { Scenes } from 'telegraf'
import { WizardContext } from 'telegraf/typings/scenes'

export const AddressBookScene = new Scenes.WizardScene<WizardContext>(
	'address-book',
	async (ctx) => {
		console.log('address', ctx.scene)
		await ctx.reply('Пришлите адрес для добавления в адресную книгу.', {
			reply_markup: {
				inline_keyboard: [
					[
						{
							callback_data: 'cancel-scene',
							text: 'Отменить'
						}
					]
				]
			}
		});
	
		return ctx.wizard.next();
	},
	async (ctx) => {
		// @ts-ignore
		ctx.scene.session.address = ctx.text;
		ctx.reply('Пришлите название для адреса');
		return ctx.wizard.next();
	},
	async (ctx) => {
		// @ts-ignore
		ctx.scene.session.contactName = ctx.text;
		await prisma.addressBook.create({
			data: {
				// @ts-ignore
				address: ctx.scene.session.address as string,
				// @ts-ignore
				name: ctx.scene.session.contactName as string,
				userId: ctx.from?.id.toString()!,
			},
		});
		// @ts-ignore
		ctx.reply(`Адрес ${ctx.scene.session.contactName} успешно создан.`, {
			reply_markup: {
				inline_keyboard: [previousButton('contacts_note')],
			},
		});
		return ctx.scene.leave();
	}
);

// Обработчик, когда пользователь покидает сцену
AddressBookScene.action('leave-scene', (ctx) =>{
	ctx.scene.leave()
	ctx.reply('Вы вышли из процесса добавления адреса.')
});
