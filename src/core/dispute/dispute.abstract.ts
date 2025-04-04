import {bot} from "@/config/bot";
import {Dispute} from "@prisma/client";

abstract class DisputeAbstract {

    api = bot

    abstract getUser(id: string): void;
    public abstract isSeller(id: string): Promise<boolean | null>
    abstract createDispute(contractTransactionId: string): Promise<Dispute>
    abstract updateStatusContractTransaction(contractTransactionId: string, value: boolean): Promise<Dispute>
}

export default DisputeAbstract