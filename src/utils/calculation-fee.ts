import {prisma} from "@/prisma/prisma.client";

export const calculationFee = async (value: number) => {
    const config = await prisma.config.findFirst();
    let fee
    let valueWithFee
    if (!config || !config.feeForTransaction) {
        fee = 0
        valueWithFee = value
    } else {
        fee = (config.feeForTransaction / 100) * value;
        valueWithFee = value - fee
    }
    return {
        fee,
        valueWithFee
    }
};
