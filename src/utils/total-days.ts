export const totalDays = (createdAt: Date): number => {
	const registrationDate = new Date(createdAt)
	const currentDate = new Date()
	const diffInMs = currentDate.getTime() - registrationDate.getTime()
	return Math.floor(diffInMs / (1000 * 60 * 60 * 24))
}
