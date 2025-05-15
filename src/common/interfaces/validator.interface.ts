import type { ValidationOptions } from 'class-validator';

/**
 * Interface for wallet address validator options
 */
export interface IWalletAddressValidatorOptions extends ValidationOptions {
  message?: string;
}

/**
 * Interface for date of birth validator options
 */
export interface IDateOfBirthValidatorOptions extends ValidationOptions {
  message?: string;
  minimumAge?: number; // Default: 18
}

/**
 * Interface for phone number validator options
 */
export interface IPhoneNumberValidatorOptions extends ValidationOptions {
  message?: string;
  allowSpaces?: boolean; // Default: true
  allowHyphens?: boolean; // Default: true
}

/**
 * Interface for BVN validator options
 */
export interface IBVNValidatorOptions extends ValidationOptions {
  message?: string;
  length?: number; // Default: 11
}

/**
 * Interface for NIN validator options
 */
export interface ININValidatorOptions extends ValidationOptions {
  message?: string;
  length?: number; // Default: 11
}
