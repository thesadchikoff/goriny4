import {prisma} from "@/prisma/prisma.client";

class ConfigService {
    async adminWallet() {
        const config = await this.config()
        return {
            adminWalletAddress: config?.adminWalletAddress,
            adminWalletWIF: config?.adminWalletWIF
        }
    }

    private async config() {
        return prisma.config.findFirst()
    }
}

export default new ConfigService()