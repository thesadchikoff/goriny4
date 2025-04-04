import { prisma } from '@/prisma/prisma.client'

class Admin {
	getAdmin(id: number) {
		return prisma.user.findFirst({
			where: {
				userId: id,
				isAdmin: true,
			},
		})
	}
	getAdmins() {
		return prisma.user.findMany({
			where: {
				isAdmin: true,
			},
		})
	}
}

export default new Admin()
