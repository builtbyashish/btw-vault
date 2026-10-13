import { CardNetworkDefinition } from './types';

export const CARD_NETWORK_DEFINITIONS: CardNetworkDefinition[] = [
  // 1. ELO (Brazil) - Evaluated first due to overlapping 4/5/6 prefixes
  {
    id: 'elo',
    name: 'Elo',
    iinRanges: [
      { start: '401178', end: '401179' },
      { start: '431274', end: '431274' },
      { start: '438935', end: '438935' },
      { start: '451416', end: '451416' },
      { start: '457393', end: '457393' },
      { start: '457631', end: '457632' },
      { start: '504175', end: '504175' },
      { start: '506699', end: '506778' },
      { start: '509000', end: '509999' },
      { start: '627780', end: '627780' },
      { start: '636297', end: '636297' },
      { start: '636368', end: '636368' },
      { start: '650031', end: '650033' },
      { start: '650035', end: '650051' },
      { start: '650405', end: '650439' },
      { start: '650485', end: '650538' },
      { start: '650541', end: '650598' },
      { start: '650700', end: '650718' },
      { start: '650720', end: '650727' },
      { start: '650901', end: '650978' },
      { start: '651652', end: '651679' },
      { start: '655000', end: '655019' },
      { start: '655021', end: '655058' },
    ],
    allowedLengths: [16],
    checksum: 'luhn',
    cvvLength: 3,
    formattingGaps: [4, 8, 12],
    placeholder: '•••• •••• •••• ••••',
    primaryColor: '#00A4E4',
    gradientColors: ['#00A4E4', '#004B87'],
  },

  // 2. RUPAY (India) - Evaluated before generic 60/65 ranges
  {
    id: 'rupay',
    name: 'RuPay',
    iinRanges: [
      { start: '60', end: '60' },
      { start: '652150', end: '653149' },
      { start: '6521', end: '6522' },
      { start: '508', end: '508' },
      { start: '6061', end: '6085' },
      { start: '3538', end: '3538' },
      { start: '356', end: '356' },
      { start: '81', end: '82' },
    ],
    allowedLengths: [16],
    checksum: 'luhn',
    cvvLength: 3,
    formattingGaps: [4, 8, 12],
    placeholder: '•••• •••• •••• ••••',
    primaryColor: '#097939',
    gradientColors: ['#007934', '#F47920'],
  },

  // 3. TROY (Turkey)
  {
    id: 'troy',
    name: 'Troy',
    iinRanges: [
      { start: '979200', end: '979289' },
      { start: '9792', end: '9792' },
    ],
    allowedLengths: [16],
    checksum: 'luhn',
    cvvLength: 3,
    formattingGaps: [4, 8, 12],
    placeholder: '•••• •••• •••• ••••',
    primaryColor: '#00529B',
    gradientColors: ['#00529B', '#1E88E5'],
  },

  // 4. MIR (Russia)
  {
    id: 'mir',
    name: 'Mir',
    iinRanges: [
      { start: '2200', end: '2204' },
    ],
    allowedLengths: [16, 17, 18, 19],
    checksum: 'luhn',
    cvvLength: 3,
    formattingGaps: [4, 8, 12],
    placeholder: '•••• •••• •••• ••••',
    primaryColor: '#0F7545',
    gradientColors: ['#009A51', '#006C35'],
  },

  // 5. BANCONTACT (Belgium)
  {
    id: 'bancontact',
    name: 'Bancontact',
    iinRanges: [
      { start: '6703', end: '6703' },
      { start: '5064', end: '5064' },
      { start: '6033', end: '6033' },
    ],
    allowedLengths: [16, 17, 18, 19],
    checksum: 'luhn',
    cvvLength: 3,
    formattingGaps: [4, 8, 12],
    placeholder: '•••• •••• •••• ••••',
    primaryColor: '#004A99',
    gradientColors: ['#004A99', '#FFD100'],
  },

  // 6. AMERICAN EXPRESS
  {
    id: 'amex',
    name: 'American Express',
    iinRanges: [
      { start: '34', end: '34' },
      { start: '37', end: '37' },
    ],
    allowedLengths: [15],
    checksum: 'luhn',
    cvvLength: 4,
    formattingGaps: [4, 10], // 4-6-5
    placeholder: '•••• •••••• •••••',
    primaryColor: '#002663',
    gradientColors: ['#2E77BC', '#002663'],
  },

  // 7. DINERS CLUB
  {
    id: 'diners-club',
    name: 'Diners Club',
    iinRanges: [
      { start: '300', end: '305' },
      { start: '3095', end: '3095' },
      { start: '36', end: '36' },
      { start: '38', end: '39' },
    ],
    allowedLengths: [14, 16, 19],
    checksum: 'luhn',
    cvvLength: 3,
    formattingGaps: [4, 10],
    placeholder: '•••• •••••• ••••',
    primaryColor: '#0079AC',
    gradientColors: ['#0079AC', '#004B6E'],
  },

  // 8. JCB (Japan)
  {
    id: 'jcb',
    name: 'JCB',
    iinRanges: [
      { start: '3528', end: '3589' },
    ],
    allowedLengths: [16, 17, 18, 19],
    checksum: 'luhn',
    cvvLength: 3,
    formattingGaps: [4, 8, 12],
    placeholder: '•••• •••• •••• ••••',
    primaryColor: '#0E4C92',
    gradientColors: ['#0E4C92', '#002E6E'],
  },

  // 9. UNIONPAY (China)
  {
    id: 'unionpay',
    name: 'UnionPay',
    iinRanges: [
      { start: '620000', end: '629999' },
      { start: '62', end: '62' },
      { start: '81', end: '81' },
    ],
    allowedLengths: [16, 17, 18, 19],
    checksum: 'luhn',
    cvvLength: 3,
    formattingGaps: [4, 8, 12],
    placeholder: '•••• •••• •••• ••••',
    primaryColor: '#C41230',
    gradientColors: ['#C41230', '#007988'],
  },

  // 10. DISCOVER
  {
    id: 'discover',
    name: 'Discover',
    iinRanges: [
      { start: '6011', end: '6011' },
      { start: '622126', end: '622925' },
      { start: '644', end: '649' },
      { start: '65', end: '65' },
    ],
    allowedLengths: [16, 19],
    checksum: 'luhn',
    cvvLength: 3,
    formattingGaps: [4, 8, 12],
    placeholder: '•••• •••• •••• ••••',
    primaryColor: '#FF6000',
    gradientColors: ['#FF6000', '#D34800'],
  },

  // 11. MAESTRO
  {
    id: 'maestro',
    name: 'Maestro',
    iinRanges: [
      { start: '5018', end: '5018' },
      { start: '5020', end: '5020' },
      { start: '5038', end: '5038' },
      { start: '5893', end: '5893' },
      { start: '6304', end: '6304' },
      { start: '6759', end: '6759' },
      { start: '6761', end: '6763' },
      { start: '50', end: '50' },
      { start: '56', end: '58' },
    ],
    allowedLengths: [12, 13, 14, 15, 16, 17, 18, 19],
    checksum: 'luhn',
    cvvLength: 3,
    formattingGaps: [4, 8, 12],
    placeholder: '•••• •••• •••• ••••',
    primaryColor: '#0099DF',
    gradientColors: ['#CC0000', '#0099DF'],
  },

  // 12. MASTERCARD
  {
    id: 'mastercard',
    name: 'Mastercard',
    iinRanges: [
      { start: '51', end: '55' },
      { start: '2221', end: '2720' },
    ],
    allowedLengths: [16],
    checksum: 'luhn',
    cvvLength: 3,
    formattingGaps: [4, 8, 12],
    placeholder: '•••• •••• •••• ••••',
    primaryColor: '#EB001B',
    gradientColors: ['#EB001B', '#F79E1B'],
  },

  // 13. VISA
  {
    id: 'visa',
    name: 'Visa',
    iinRanges: [
      { start: '4', end: '4' },
    ],
    allowedLengths: [13, 16, 19],
    checksum: 'luhn',
    cvvLength: 3,
    formattingGaps: [4, 8, 12],
    placeholder: '•••• •••• •••• ••••',
    primaryColor: '#1A1F71',
    gradientColors: ['#1A1F71', '#00579E'],
  },
];

export const UNKNOWN_NETWORK_DEFINITION: CardNetworkDefinition = {
  id: 'unknown',
  name: 'Unknown',
  iinRanges: [],
  allowedLengths: [12, 13, 14, 15, 16, 17, 18, 19],
  checksum: 'luhn',
  cvvLength: [3, 4],
  formattingGaps: [4, 8, 12],
  placeholder: '•••• •••• •••• ••••',
  primaryColor: '#4A5568',
  gradientColors: ['#4A5568', '#1A202C'],
};
