import { Logger, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { Transaction } from '../../Transaction/entity/transaction.entity';
// Assuming BlockRadarDepositSuccessEventDataDto will be made available via export/import
// For example, by moving it to a shared DTO file or exporting from controller
import type { BlockRadarDepositSuccessEventDataDto } from '../controllers/addressMonitoring.webhook.controller';

export async function processDepositSuccessEvent(
    eventData: BlockRadarDepositSuccessEventDataDto,
    entityManager: EntityManager,
): Promise<void> {
    const logger = new Logger(processDepositSuccessEvent.name);

    const params = {
        userId: eventData.address.name,
        usdAmount: eventData.amount,
        type: 'deposit' as 'deposit',
        status: 'completed' as 'completed',
        transactionReference: eventData.hash,
        merchantName: 'Zero Card',
        merchantId: 'zero_card',
        authorizationId: eventData.hash,
        category: 'crypto_deposit',
        channel: 'crypto',
        transactionHash: eventData.hash,
        transactionModeType: 'crypto_deposit',
        tokenInfo: [{
            chain: eventData.blockchain.isEvmCompatible ? "ethereum" : "solana",
            blockchain: `${eventData.blockchain.slug.toLowerCase()}_${eventData.network.toLowerCase()}`,
            token: eventData.asset.symbol,
        }],
        recipientAddress: eventData.recipientAddress,
        senderAddress: eventData.senderAddress,
        nairaAmount: null,
        cardId: null,
        state: null,
        city: null,
        effectiveFxRate: null,
        toAddress: eventData.recipientAddress,
    };

    logger.log(`Attempting to process deposit for userId: ${params.userId}, txHash: ${params.transactionHash}`);

    await entityManager.transaction(async (transactionalEntityManager) => {
        const userRepository = transactionalEntityManager.getRepository(User);
        const userEntity = await userRepository.findOneBy({ userId: params.userId });

        if (!userEntity) {
            logger.error(`User not found with userId: ${params.userId}`);
            throw new NotFoundException(`User not found with userId: ${params.userId}`);
        }

        const newTransaction = new Transaction();
        newTransaction.user = userEntity;
        newTransaction.usdAmount = parseFloat(params.usdAmount);
        newTransaction.type = params.type;
        newTransaction.status = params.status;
        newTransaction.transactionReference = params.transactionReference;
        newTransaction.merchantName = params.merchantName;
        newTransaction.merchantId = params.merchantId;
        newTransaction.authorizationId = params.authorizationId;
        newTransaction.category = params.category;
        newTransaction.channel = params.channel;
        newTransaction.transactionHash = params.transactionHash;
        newTransaction.transactionModeType = params.transactionModeType;
        newTransaction.tokenInfo = params.tokenInfo;
        newTransaction.recipientAddress = params.recipientAddress;
        newTransaction.nairaAmount = params.nairaAmount;
        newTransaction.cardId = params.cardId;
        newTransaction.state = params.state;
        newTransaction.city = params.city;
        newTransaction.effectiveFxRate = params.effectiveFxRate;
        newTransaction.toAddress = params.toAddress;

        await transactionalEntityManager.save(Transaction, newTransaction);
        logger.log(`Successfully created deposit transaction for user: ${params.userId}, txHash: ${params.transactionHash}`);
    });
}
