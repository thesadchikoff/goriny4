import {BotContext} from "@/@types/scenes";
import {prisma} from "@/prisma/prisma.client";
import {createTransaction, sendTransaction} from "@/trust-wallet/1";
import userService from "@/db/user.service";

export const transferAction = async (ctx: BotContext) => {
   try {
       console.log("transferAction", ctx.session.transfer);
       const user = await userService.fetchOneById({
           id: ctx.from!.id
       })
       // @ts-ignore
       const btcCount = ctx.session.countBTC

       const globalConfig = await prisma.config.findFirst()
       const btcForAdmin =
           btcCount * (globalConfig?.feeForTransaction! / 100)
       const transfer = createTransaction(user!.wallet!.wif, btcCount, ctx.session.transfer?.recipientAddress, globalConfig!.feeForTransaction).then(txHash => {
           if (txHash) {
               sendTransaction(txHash)
           }
       })
       let transferToAdmin
       if (globalConfig) {
           transferToAdmin = createTransaction(user!.wallet!.wif, btcCount, globalConfig.adminWalletAddress!, globalConfig!.feeForTransaction).then(txHash => {
               if (txHash) {
                   sendTransaction(txHash)
               }
           })
       }
       console.log(transferToAdmin)
       console.log(transfer)
       ctx.session.transfer = {}
       return ctx.scene.leave()
   } catch (error) {
       return ctx.reply(error);
   }
}