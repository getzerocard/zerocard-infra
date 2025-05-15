import { Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { encodeFunctionData, getAddress } from 'viem';
import { erc20Abi } from '../../../common/abi/abi';
import type { Token } from '../../../common/util/fetchsupportedTokens';
import { getTokenBySymbol } from '../../../common/util/fetchsupportedTokens';

/**
 * Handles the debit of an order fee from a user's wallet to a specified recipient.
 * @param userId - The ID of the user in Privy
 * @param tokenSymbol - The symbol of the token to transfer (e.g., 'USDC', 'USDT')
 * @param network - The network type ('MAINET' or 'TESTNET')
 * @param amount - The amount of tokens to transfer as a string
 * @param recipientAddress - The address to receive the fee
 * @param chainType - The blockchain type ('ethereum' or 'solana')
 * @param blockchainNetwork - Optional specific blockchain network name (e.g., 'BNB Smart Chain', 'Base')
 * @param privyService - The Privy service instance to send transactions and fetch wallet information
 * @returns Promise<{ hash: string }> - The transaction hash of the transfer
 * @throws Error if token information is not found, wallet not found, or transaction fails
 */
export async function debitOrderFee(
  userId: string,
  tokenSymbol: string,
  network: string,
  amount: string,
  recipientAddress: string,
  chainType: 'ethereum' | 'solana',
  blockchainNetwork?: string,
  privyService?: any,
): Promise<{ hash: string }> {
  const logger = new Logger('DebitOrderFeeHandler');

  // Helper function for error logging and throwing
  const logAndThrow = (message: string) => {
    logger.error(message);
    throw new Error(message);
  };

  // Fetch user's wallet using PrivyService
  const wallets = await privyService.getWalletId(userId, chainType);
  if (!wallets.length) {
    logAndThrow(`No ${chainType} wallet found for user with ID ${userId}`);
  }

  // Find the wallet for the specified chain type
  const userWallet = wallets.find((wallet) => wallet.address && wallet.id);
  if (!userWallet) {
    logAndThrow(
      `No valid ${chainType} wallet found for user with ID ${userId}`,
    );
  }

  // Fetch token information
  const tokenInfo: Token | undefined = getTokenBySymbol(
    tokenSymbol,
    network,
    chainType,
    blockchainNetwork,
  );
  if (!tokenInfo) {
    logAndThrow(
      `Token ${tokenSymbol} not found for network ${network}${blockchainNetwork ? ' on ' + blockchainNetwork : ''}`,
    );
  }

  // Parse the amount to base units based on token decimals
  const tokenAmount = ethers.parseUnits(amount, tokenInfo.decimals);

  // Execute the transfer transaction using ERC20 transfer function
  let transferResponse;
  try {
    transferResponse = await privyService.sendEthereumTransaction(
      userWallet.id,
      {
        transaction: {
          to: getAddress(tokenInfo.tokenAddress),
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'transfer',
            args: [getAddress(recipientAddress), tokenAmount],
          }),
        },
        chainId: tokenInfo.chainId.toString(),
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logAndThrow(
      `Failed to send transaction for user ${userId}: ${errorMessage}`,
    );
  }

  // Immediately notify if transaction hash is not received
  if (!transferResponse.hash) {
    logAndThrow(`Transaction hash not received for user ${userId}`);
  }

  // Wait for transaction confirmation with a timeout
  const provider = new ethers.JsonRpcProvider(tokenInfo.rpcUrl);
  try {
    const receipt = await Promise.race([
      provider.waitForTransaction(transferResponse.hash),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Transaction confirmation timeout')),
          30000,
        ),
      ),
    ]);
    if ((receipt as ethers.TransactionReceipt).status !== 1) {
      logAndThrow(
        `Transfer transaction failed for user ${userId}: ${transferResponse.hash}`,
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logAndThrow(
      `Transaction confirmation failed or timed out: ${errorMessage}`,
    );
  }

  return { hash: transferResponse.hash };
}
