/**
 * Shipping address interface
 */
export interface IShippingAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

/**
 * Identification interface
 */
export interface IIdentification {
  type: 'NIN' | 'BVN';
  number: string;
}

/**
 * User entity interface
 */
export interface IUser {
  id: string;
  EVMWalletAddress?: string;
  SolanaWalletAddress?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  phoneNumber?: string;
  shippingAddress?: IShippingAddress;
  identification?: IIdentification;
  verificationStatus: 'pending' | 'verified';
  cardOrderStatus:
    | 'not_ordered'
    | 'verified'
    | 'ordered'
    | 'shipped'
    | 'delivered';
  customerId?: string;
  createdAt: Date;
  updatedAt: Date;
}
