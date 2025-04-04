export const config = {
	shopName: 'Goryny4Bit',
	messages: {
		adminNotify: ({
			username,
			login,
			id
		}: {
			username: string,
			login: string,
			id: string
		}) => `<b>Оповещение</b>\n\nНовый зарегистрированный пользователь:\n<b>LOGIN:</b> /${login}\n<b>USERNAME:</b> @${username}\n<b>ID:</b> <code>${id}</code>`,
	}
}
