// --- BlockRadar Specific DTOs for Success Response ---
export interface BlockRadarBlockchainDto {
    createdAt: string;
    derivationPath: string | null;
    id: string;
    isActive: boolean;
    isEvmCompatible: boolean;
    logoUrl: string;
    name: string;
    slug: string;
    symbol: string;
    tokenStandard: string | null;
    updatedAt: string;
}

export interface BlockRadarAmlConfigurationDto {
    message: string;
    provider: string;
    status: string;
}

export interface BlockRadarConfigurationsDto {
    aml: BlockRadarAmlConfigurationDto;
}

export interface BlockRadarWhitelistDataDto {
    address: string;
    blockchain: BlockRadarBlockchainDto;
    configurations: BlockRadarConfigurationsDto;
    createdAt: string;
    derivationPath: string | null;
    id: string;
    isActive: boolean;
    metadata: any | null;
    name: string;
    network: string;
    type: string;
    updatedAt: string;
}
// --- End BlockRadar Specific DTOs ---

// Request DTO for whitelisting an address
export interface WhitelistAddressDto {
    address: string;
    network: string; // e.g., 'ethereum', 'bitcoin', 'tron_trc20_usdt'
    name?: string; // Optional name/label for the address
    // Add any other fields required by the BlockRadar API for whitelisting
}

export interface AddressWhitelistSuccessResponseDto {
    message: string;
    statusCode: number;
    data: BlockRadarWhitelistDataDto;
}

// Simplified response DTO after successful whitelist operation
export interface AddressWhitelistedResponseDto {
    userId: string;
    walletAddress: string;
    whitelisted: boolean;
}
