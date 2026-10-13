export type CardNetwork =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'discover'
  | 'jcb'
  | 'unionpay'
  | 'rupay'
  | 'diners-club'
  | 'maestro'
  | 'elo'
  | 'mir'
  | 'troy'
  | 'bancontact'
  | 'unknown';

export type CardValidationError =
  | 'EMPTY'
  | 'INVALID_CHARACTERS'
  | 'INVALID_LENGTH'
  | 'UNKNOWN_NETWORK'
  | 'INVALID_CHECKSUM';

export interface CardValidationResult {
  network: CardNetwork;
  isComplete: boolean;
  isValidFormat: boolean;
  checksumValid: boolean | null;
  isValid: boolean;
  possibleNetworks: CardNetwork[];
  errors: CardValidationError[];
}

export interface IINRange {
  start: string;
  end: string;
  length?: number;
}

export interface CardNetworkDefinition {
  id: CardNetwork;
  name: string;
  iinRanges: IINRange[];
  allowedLengths: number[];
  checksum: 'luhn' | 'none' | 'custom' | 'unknown';
  cvvLength: number | number[]; // e.g. 4 for Amex, 3 for Visa
  formattingGaps: number[]; // Character indices where spaces should be inserted
  placeholder: string;
  primaryColor: string;
  gradientColors: [string, string];
}
