import React from 'react';
import { Text } from 'react-native';
import {
  // Security & Identity
  KeyRound,
  Lock,
  ShieldCheck,
  Fingerprint,
  Eye,
  User,
  Users,
  QrCode,
  Crown,
  Sparkles,
  // Finance & Shopping
  CreditCard,
  Wallet,
  Landmark,
  DollarSign,
  PiggyBank,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Gem,
  Coins,
  // Tech & Devices
  Smartphone,
  Laptop,
  Monitor,
  Server,
  Terminal,
  Database,
  Wifi,
  Cloud,
  FileCode,
  Cpu,
  Radio,
  Bluetooth,
  // Life & Personal
  House,
  Heart,
  Stethoscope,
  Briefcase,
  GraduationCap,
  Baby,
  Dog,
  Cat,
  Gift,
  Award,
  Shirt,
  // Travel & Vehicles
  Car,
  Plane,
  Bike,
  Train,
  MapPin,
  Globe,
  Hotel,
  Fuel,
  Ticket,
  Compass,
  // Entertainment & Media
  Gamepad2,
  Tv,
  Music,
  Headphones,
  Camera,
  Film,
  BookOpen,
  Coffee,
  Utensils,
  Dumbbell,
  Palette,
  Trophy,
  // Docs & Work
  StickyNote,
  Folder,
  FileText,
  Mail,
  Paperclip,
  Bookmark,
  Archive,
  Layers,
  Hash,
  Clock,
  LucideIcon,
} from 'lucide-react-native';
import { ItemCategory, CustomCategoryDefinition } from '../types';

export interface CategoryTheme {
  category: ItemCategory;
  name: string;
  color: string;      // Primary vibrant hex
  bgTint: string;     // Soft pastel tint background
  icon: any;
}

export type IconGroupKey =
  | 'all'
  | 'security'
  | 'finance'
  | 'tech'
  | 'life'
  | 'travel'
  | 'media'
  | 'docs'
  | 'emoji';

export interface CuratedIconItem {
  id: string;          // Icon key or emoji: e.g. 'KeyRound' or 'emoji:🚗'
  label: string;       // Human readable title
  group: IconGroupKey;
  tags: string[];      // Keywords for searching
  isEmoji?: boolean;
  emojiChar?: string;
  icon?: LucideIcon;
}

// Check whether a string represents an emoji
export function isEmojiIcon(iconString?: string): boolean {
  if (!iconString) return false;
  if (iconString.startsWith('emoji:')) return true;
  const emojiRegex = /\p{Extended_Pictographic}/u;
  return emojiRegex.test(iconString);
}

// Clean emoji string (strip 'emoji:' prefix)
export function cleanEmoji(iconString: string): string {
  if (!iconString) return '📁';
  if (iconString.startsWith('emoji:')) {
    return iconString.replace('emoji:', '');
  }
  return iconString;
}

// Component cache to memoize dynamically generated emoji icons
const emojiComponentCache = new Map<string, React.FC<any>>();

export function getEmojiIconComponent(emojiStr: string): React.FC<{ size?: number; color?: string; style?: any }> {
  const emoji = cleanEmoji(emojiStr);
  if (!emojiComponentCache.has(emoji)) {
    const EmojiComp: React.FC<{ size?: number; color?: string; style?: any }> = ({ size = 20, style }) =>
      React.createElement(
        Text,
        {
          style: [
            {
              fontSize: Math.max(12, Math.round(size * 0.9)),
              textAlign: 'center',
              includeFontPadding: false,
            },
            style,
          ],
        },
        emoji
      );
    EmojiComp.displayName = `EmojiIcon_${emoji}`;
    emojiComponentCache.set(emoji, EmojiComp);
  }
  return emojiComponentCache.get(emoji)!;
}

// Base dictionary of all supported Lucide icons
export const BASE_CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  // Security & Identity
  KeyRound,
  Lock,
  ShieldCheck,
  Fingerprint,
  Eye,
  User,
  Users,
  QrCode,
  Crown,
  Sparkles,
  // Finance & Shopping
  CreditCard,
  Wallet,
  Landmark,
  DollarSign,
  PiggyBank,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Gem,
  Coins,
  // Tech & Devices
  Smartphone,
  Laptop,
  Monitor,
  Server,
  Terminal,
  Database,
  Wifi,
  Cloud,
  FileCode,
  Cpu,
  Radio,
  Bluetooth,
  // Life & Personal
  House,
  Heart,
  Stethoscope,
  Briefcase,
  GraduationCap,
  Baby,
  Dog,
  Cat,
  Gift,
  Award,
  Shirt,
  // Travel & Vehicles
  Car,
  Plane,
  Bike,
  Train,
  MapPin,
  Globe,
  Hotel,
  Fuel,
  Ticket,
  Compass,
  // Entertainment & Media
  Gamepad2,
  Tv,
  Music,
  Headphones,
  Camera,
  Film,
  BookOpen,
  Coffee,
  Utensils,
  Dumbbell,
  Palette,
  Trophy,
  // Docs & Work
  StickyNote,
  Folder,
  FileText,
  Mail,
  Paperclip,
  Bookmark,
  Archive,
  Layers,
  Hash,
  Clock,
};

// Returns a component for any given icon key or emoji
export function getCategoryIcon(iconKey?: string): LucideIcon | React.FC<any> {
  if (!iconKey) return Folder;
  if (isEmojiIcon(iconKey)) {
    return getEmojiIconComponent(iconKey);
  }
  return BASE_CATEGORY_ICON_MAP[iconKey] || Folder;
}

// Proxy wrapper around BASE_CATEGORY_ICON_MAP so existing accesses CATEGORY_ICON_MAP[c.icon]
// transparently resolve dynamic emoji strings as well as legacy and new Lucide icons!
export const CATEGORY_ICON_MAP: Record<string, any> = new Proxy(BASE_CATEGORY_ICON_MAP as any, {
  get(target, prop: string) {
    if (typeof prop !== 'string') return undefined;
    if (prop in target) return target[prop];
    if (isEmojiIcon(prop)) {
      return getEmojiIconComponent(prop);
    }
    return Folder;
  },
});

// Category Group definitions for filtering
export const CATEGORY_ICON_GROUPS: { key: IconGroupKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'security', label: 'Security' },
  { key: 'finance', label: 'Finance' },
  { key: 'tech', label: 'Tech' },
  { key: 'life', label: 'Life' },
  { key: 'travel', label: 'Travel' },
  { key: 'media', label: 'Media' },
  { key: 'docs', label: 'Docs' },
  { key: 'emoji', label: 'Emojis' },
];

// Curated library of 70+ Lucide icons with metadata and tags for search
export const CURATED_CATEGORY_ICONS: CuratedIconItem[] = [
  // Security & Identity
  { id: 'KeyRound', label: 'Key', group: 'security', tags: ['key', 'password', 'auth', 'secret', 'token'], icon: KeyRound },
  { id: 'Lock', label: 'Lock', group: 'security', tags: ['lock', 'private', 'secure', 'safe', 'vault'], icon: Lock },
  { id: 'ShieldCheck', label: 'Shield', group: 'security', tags: ['shield', 'security', 'protection', 'guard'], icon: ShieldCheck },
  { id: 'Fingerprint', label: 'Biometrics', group: 'security', tags: ['fingerprint', 'touch', 'face', 'bio', 'id', 'passkey'], icon: Fingerprint },
  { id: 'Eye', label: 'Eye', group: 'security', tags: ['eye', 'reveal', 'view', 'watch', 'private'], icon: Eye },
  { id: 'User', label: 'Identity', group: 'security', tags: ['user', 'person', 'profile', 'account', 'personal', 'passport'], icon: User },
  { id: 'Users', label: 'Family / Team', group: 'security', tags: ['users', 'group', 'family', 'shared', 'team', 'friends'], icon: Users },
  { id: 'QrCode', label: '2FA / QR', group: 'security', tags: ['qr', 'code', '2fa', 'totp', 'authenticator', 'scan'], icon: QrCode },
  { id: 'Crown', label: 'VIP / Admin', group: 'security', tags: ['crown', 'premium', 'vip', 'elite', 'admin', 'leader'], icon: Crown },
  { id: 'Sparkles', label: 'Favorites', group: 'security', tags: ['star', 'sparkles', 'special', 'magic', 'feature'], icon: Sparkles },

  // Finance & Shopping
  { id: 'CreditCard', label: 'Credit Card', group: 'finance', tags: ['card', 'credit', 'debit', 'visa', 'mastercard', 'amex', 'payment'], icon: CreditCard },
  { id: 'Wallet', label: 'Wallet', group: 'finance', tags: ['wallet', 'cash', 'money', 'crypto', 'pay', 'funds'], icon: Wallet },
  { id: 'Landmark', label: 'Bank', group: 'finance', tags: ['bank', 'landmark', 'institution', 'account', 'wire', 'deposit'], icon: Landmark },
  { id: 'DollarSign', label: 'Currency', group: 'finance', tags: ['dollar', 'cash', 'currency', 'finance', 'income', 'salary', 'money'], icon: DollarSign },
  { id: 'PiggyBank', label: 'Savings', group: 'finance', tags: ['savings', 'piggy', 'invest', 'fund', 'retirement'], icon: PiggyBank },
  { id: 'Receipt', label: 'Bills / Tax', group: 'finance', tags: ['receipt', 'bill', 'invoice', 'tax', 'statement', 'expense'], icon: Receipt },
  { id: 'ShoppingBag', label: 'Shopping', group: 'finance', tags: ['shopping', 'bag', 'store', 'ecommerce', 'buy', 'clothing'], icon: ShoppingBag },
  { id: 'ShoppingCart', label: 'Cart / Orders', group: 'finance', tags: ['cart', 'groceries', 'checkout', 'orders', 'supermarket'], icon: ShoppingCart },
  { id: 'Gem', label: 'Crypto / Assets', group: 'finance', tags: ['gem', 'diamond', 'crypto', 'nft', 'gold', 'valuables', 'jewel'], icon: Gem },
  { id: 'Coins', label: 'Coins', group: 'finance', tags: ['coins', 'tokens', 'change', 'crypto', 'cash'], icon: Coins },

  // Tech & Devices
  { id: 'Smartphone', label: 'Phone', group: 'tech', tags: ['phone', 'mobile', 'ios', 'android', 'device', 'cellular'], icon: Smartphone },
  { id: 'Laptop', label: 'Laptop', group: 'tech', tags: ['laptop', 'computer', 'macbook', 'workstation', 'notebook'], icon: Laptop },
  { id: 'Monitor', label: 'Desktop', group: 'tech', tags: ['monitor', 'screen', 'pc', 'display', 'rig'], icon: Monitor },
  { id: 'Server', label: 'Server', group: 'tech', tags: ['server', 'host', 'backend', 'vps', 'cloud', 'rack'], icon: Server },
  { id: 'Terminal', label: 'Terminal / CLI', group: 'tech', tags: ['terminal', 'cli', 'shell', 'bash', 'ssh', 'cmd'], icon: Terminal },
  { id: 'Database', label: 'Database', group: 'tech', tags: ['database', 'sql', 'postgres', 'mongo', 'redis', 'db'], icon: Database },
  { id: 'Wifi', label: 'Wi-Fi', group: 'tech', tags: ['wifi', 'network', 'router', 'internet', 'hotspot', 'broadband'], icon: Wifi },
  { id: 'Cloud', label: 'Cloud Drive', group: 'tech', tags: ['cloud', 'aws', 'gcp', 'azure', 'backup', 'drive', 'icloud', 'dropbox'], icon: Cloud },
  { id: 'FileCode', label: 'Source Code', group: 'tech', tags: ['code', 'developer', 'api', 'git', 'repo', 'github', 'programming'], icon: FileCode },
  { id: 'Cpu', label: 'CPU / Hardware', group: 'tech', tags: ['cpu', 'chip', 'processor', 'hardware', 'iot', 'specs'], icon: Cpu },
  { id: 'Radio', label: 'IoT / Wireless', group: 'tech', tags: ['radio', 'iot', 'signal', 'wireless', 'rfid', 'sensor'], icon: Radio },
  { id: 'Bluetooth', label: 'Bluetooth', group: 'tech', tags: ['bluetooth', 'wireless', 'device', 'sync', 'pair'], icon: Bluetooth },

  // Life & Personal
  { id: 'House', label: 'Home / Living', group: 'life', tags: ['home', 'house', 'address', 'property', 'rent', 'mortgage', 'lease'], icon: House },
  { id: 'Heart', label: 'Health', group: 'life', tags: ['heart', 'health', 'medical', 'wellness', 'fitness', 'cardio'], icon: Heart },
  { id: 'Stethoscope', label: 'Medical Care', group: 'life', tags: ['doctor', 'clinic', 'hospital', 'prescription', 'medicine', 'checkup'], icon: Stethoscope },
  { id: 'Briefcase', label: 'Work / Career', group: 'life', tags: ['work', 'job', 'career', 'office', 'business', 'resume'], icon: Briefcase },
  { id: 'GraduationCap', label: 'Education', group: 'life', tags: ['school', 'college', 'university', 'course', 'degree', 'student'], icon: GraduationCap },
  { id: 'Baby', label: 'Kids / Family', group: 'life', tags: ['baby', 'child', 'family', 'kids', 'infant', 'toddler'], icon: Baby },
  { id: 'Dog', label: 'Pets', group: 'life', tags: ['dog', 'cat', 'pet', 'vet', 'animal', 'puppy'], icon: Dog },
  { id: 'Cat', label: 'Cats', group: 'life', tags: ['cat', 'kitten', 'pet', 'animal'], icon: Cat },
  { id: 'Gift', label: 'Gifts / Wishlist', group: 'life', tags: ['gift', 'present', 'birthday', 'holiday', 'wishlist'], icon: Gift },
  { id: 'Award', label: 'Licenses / Certs', group: 'life', tags: ['award', 'certificate', 'license', 'diploma', 'badge'], icon: Award },
  { id: 'Shirt', label: 'Apparel', group: 'life', tags: ['clothes', 'fashion', 'shopping', 'size', 'apparel'], icon: Shirt },

  // Travel & Vehicles
  { id: 'Car', label: 'Car / Auto', group: 'travel', tags: ['car', 'vehicle', 'auto', 'insurance', 'driving', 'motor', 'uber'], icon: Car },
  { id: 'Plane', label: 'Flights / Travel', group: 'travel', tags: ['plane', 'flight', 'airline', 'travel', 'passport', 'vacation', 'airport'], icon: Plane },
  { id: 'Bike', label: 'Bicycle / Moto', group: 'travel', tags: ['bike', 'cycling', 'motorcycle', 'scooter', 'ride'], icon: Bike },
  { id: 'Train', label: 'Train / Transit', group: 'travel', tags: ['train', 'metro', 'subway', 'transit', 'ticket', 'commute'], icon: Train },
  { id: 'MapPin', label: 'Places / Pin', group: 'travel', tags: ['pin', 'map', 'address', 'place', 'gps', 'location'], icon: MapPin },
  { id: 'Globe', label: 'Web / Global', group: 'travel', tags: ['globe', 'web', 'international', 'domain', 'vpn', 'world'], icon: Globe },
  { id: 'Hotel', label: 'Hotels / Stays', group: 'travel', tags: ['hotel', 'booking', 'lodging', 'airbnb', 'stay', 'resort'], icon: Hotel },
  { id: 'Fuel', label: 'Fuel / Charging', group: 'travel', tags: ['gas', 'fuel', 'petrol', 'charging', 'ev', 'battery'], icon: Fuel },
  { id: 'Ticket', label: 'Tickets / Passes', group: 'travel', tags: ['ticket', 'concert', 'boarding', 'event', 'pass', 'movie'], icon: Ticket },
  { id: 'Compass', label: 'Adventure', group: 'travel', tags: ['compass', 'explore', 'outdoors', 'hiking', 'nature'], icon: Compass },

  // Entertainment & Media
  { id: 'Gamepad2', label: 'Gaming', group: 'media', tags: ['game', 'steam', 'playstation', 'xbox', 'nintendo', 'gamer'], icon: Gamepad2 },
  { id: 'Tv', label: 'TV / Streaming', group: 'media', tags: ['tv', 'netflix', 'hulu', 'disney', 'prime', 'movie', 'show'], icon: Tv },
  { id: 'Music', label: 'Music', group: 'media', tags: ['music', 'spotify', 'apple', 'audio', 'song', 'album'], icon: Music },
  { id: 'Headphones', label: 'Audio / Podcasts', group: 'media', tags: ['headphones', 'podcast', 'audio', 'sound', 'headset'], icon: Headphones },
  { id: 'Camera', label: 'Photos / Media', group: 'media', tags: ['camera', 'photo', 'gallery', 'portfolio', 'snapshot'], icon: Camera },
  { id: 'Film', label: 'Movies', group: 'media', tags: ['film', 'cinema', 'video', 'production', 'director'], icon: Film },
  { id: 'BookOpen', label: 'Books / Reading', group: 'media', tags: ['book', 'reading', 'kindle', 'library', 'notes', 'study'], icon: BookOpen },
  { id: 'Coffee', label: 'Coffee & Cafes', group: 'media', tags: ['coffee', 'cafe', 'espresso', 'starbucks', 'drink'], icon: Coffee },
  { id: 'Utensils', label: 'Dining & Food', group: 'media', tags: ['food', 'restaurant', 'dining', 'recipes', 'cooking'], icon: Utensils },
  { id: 'Dumbbell', label: 'Gym & Fitness', group: 'media', tags: ['gym', 'workout', 'fitness', 'training', 'sport', 'exercise'], icon: Dumbbell },
  { id: 'Palette', label: 'Art & Design', group: 'media', tags: ['art', 'design', 'creative', 'drawing', 'illustration'], icon: Palette },
  { id: 'Trophy', label: 'Sports & Wins', group: 'media', tags: ['trophy', 'sports', 'victory', 'gaming', 'league', 'winner'], icon: Trophy },

  // Docs & Work
  { id: 'StickyNote', label: 'Sticky Notes', group: 'docs', tags: ['note', 'memo', 'scratchpad', 'thought', 'quicknote'], icon: StickyNote },
  { id: 'Folder', label: 'Folders', group: 'docs', tags: ['folder', 'directory', 'archive', 'docs', 'files'], icon: Folder },
  { id: 'FileText', label: 'Documents', group: 'docs', tags: ['doc', 'file', 'contract', 'pdf', 'agreement', 'papers'], icon: FileText },
  { id: 'Mail', label: 'Email', group: 'docs', tags: ['mail', 'email', 'gmail', 'outlook', 'newsletter', 'inbox'], icon: Mail },
  { id: 'Paperclip', label: 'Attachments', group: 'docs', tags: ['clip', 'attachment', 'files', 'paperclip'], icon: Paperclip },
  { id: 'Bookmark', label: 'Bookmarks', group: 'docs', tags: ['bookmark', 'favorite', 'saved', 'readlater', 'url'], icon: Bookmark },
  { id: 'Archive', label: 'Archive', group: 'docs', tags: ['archive', 'backup', 'cold', 'storage', 'vault'], icon: Archive },
  { id: 'Layers', label: 'Multi-Factor', group: 'docs', tags: ['layers', 'stack', 'tokens', 'multi', 'tier'], icon: Layers },
  { id: 'Hash', label: 'PINs & Numbers', group: 'docs', tags: ['hash', 'pin', 'numbers', 'codes', 'numeric'], icon: Hash },
  { id: 'Clock', label: 'Reminders / Expiry', group: 'docs', tags: ['clock', 'time', 'expiry', 'due', 'schedule', 'timer'], icon: Clock },
];

// Curated Emojis library with search tags
export const CURATED_EMOJI_ICONS: CuratedIconItem[] = [
  // Keys & Security
  { id: 'emoji:🔑', label: 'Key', group: 'emoji', tags: ['key', 'secret', 'password', 'token', 'auth'], isEmoji: true, emojiChar: '🔑' },
  { id: 'emoji:🔐', label: 'Locked Key', group: 'emoji', tags: ['lock', 'auth', 'security', 'vault'], isEmoji: true, emojiChar: '🔐' },
  { id: 'emoji:🔒', label: 'Padlock', group: 'emoji', tags: ['lock', 'private', 'guard', 'closed'], isEmoji: true, emojiChar: '🔒' },
  { id: 'emoji:🛡️', label: 'Shield', group: 'emoji', tags: ['shield', 'protection', 'safe', 'defense'], isEmoji: true, emojiChar: '🛡️' },
  { id: 'emoji:⭐', label: 'Star', group: 'emoji', tags: ['star', 'favorite', 'vip', 'featured'], isEmoji: true, emojiChar: '⭐' },
  { id: 'emoji:💎', label: 'Diamond', group: 'emoji', tags: ['gem', 'diamond', 'crypto', 'rare', 'gold'], isEmoji: true, emojiChar: '💎' },
  { id: 'emoji:👑', label: 'Crown', group: 'emoji', tags: ['crown', 'king', 'vip', 'premium'], isEmoji: true, emojiChar: '👑' },

  // Finance & Money
  { id: 'emoji:💳', label: 'Credit Card', group: 'emoji', tags: ['card', 'credit', 'debit', 'payment', 'bank'], isEmoji: true, emojiChar: '💳' },
  { id: 'emoji:🏦', label: 'Bank', group: 'emoji', tags: ['bank', 'finance', 'account', 'landmark'], isEmoji: true, emojiChar: '🏦' },
  { id: 'emoji:💰', label: 'Money Bag', group: 'emoji', tags: ['money', 'cash', 'wealth', 'savings', 'dollar'], isEmoji: true, emojiChar: '💰' },
  { id: 'emoji:🪙', label: 'Coin', group: 'emoji', tags: ['coin', 'crypto', 'bitcoin', 'token', 'gold'], isEmoji: true, emojiChar: '🪙' },
  { id: 'emoji:🧾', label: 'Receipt', group: 'emoji', tags: ['receipt', 'bill', 'tax', 'expense', 'invoice'], isEmoji: true, emojiChar: '🧾' },
  { id: 'emoji:🛍️', label: 'Shopping', group: 'emoji', tags: ['shopping', 'retail', 'store', 'buy', 'bags'], isEmoji: true, emojiChar: '🛍️' },
  { id: 'emoji:🛒', label: 'Cart', group: 'emoji', tags: ['cart', 'groceries', 'supermarket', 'orders'], isEmoji: true, emojiChar: '🛒' },

  // Tech & Gadgets
  { id: 'emoji:💻', label: 'Laptop', group: 'emoji', tags: ['laptop', 'mac', 'computer', 'work', 'code'], isEmoji: true, emojiChar: '💻' },
  { id: 'emoji:📱', label: 'Phone', group: 'emoji', tags: ['phone', 'mobile', 'iphone', 'android', 'cell'], isEmoji: true, emojiChar: '📱' },
  { id: 'emoji:🎮', label: 'Gaming', group: 'emoji', tags: ['game', 'controller', 'playstation', 'xbox', 'steam'], isEmoji: true, emojiChar: '🎮' },
  { id: 'emoji:🌐', label: 'Web', group: 'emoji', tags: ['web', 'internet', 'network', 'vpn', 'online'], isEmoji: true, emojiChar: '🌐' },
  { id: 'emoji:⚡', label: 'Lightning', group: 'emoji', tags: ['zap', 'fast', 'api', 'electric', 'power'], isEmoji: true, emojiChar: '⚡' },
  { id: 'emoji:🤖', label: 'Robot / AI', group: 'emoji', tags: ['bot', 'ai', 'gpt', 'model', 'automation'], isEmoji: true, emojiChar: '🤖' },
  { id: 'emoji:🎧', label: 'Headphones', group: 'emoji', tags: ['audio', 'music', 'podcast', 'sound'], isEmoji: true, emojiChar: '🎧' },

  // Travel & Vehicles
  { id: 'emoji:🚗', label: 'Car', group: 'emoji', tags: ['car', 'auto', 'vehicle', 'drive', 'insurance'], isEmoji: true, emojiChar: '🚗' },
  { id: 'emoji:✈️', label: 'Airplane', group: 'emoji', tags: ['plane', 'flight', 'travel', 'passport', 'trip'], isEmoji: true, emojiChar: '✈️' },
  { id: 'emoji:🚀', label: 'Rocket', group: 'emoji', tags: ['rocket', 'launch', 'startup', 'fast'], isEmoji: true, emojiChar: '🚀' },
  { id: 'emoji:🚆', label: 'Train', group: 'emoji', tags: ['train', 'transit', 'subway', 'commute'], isEmoji: true, emojiChar: '🚆' },
  { id: 'emoji:🏠', label: 'Home', group: 'emoji', tags: ['home', 'house', 'rent', 'mortgage', 'address'], isEmoji: true, emojiChar: '🏠' },
  { id: 'emoji:🏖️', label: 'Beach', group: 'emoji', tags: ['vacation', 'beach', 'hotel', 'summer', 'holiday'], isEmoji: true, emojiChar: '🏖️' },

  // Life & Health
  { id: 'emoji:🏥', label: 'Hospital', group: 'emoji', tags: ['hospital', 'health', 'medical', 'clinic', 'doctor'], isEmoji: true, emojiChar: '🏥' },
  { id: 'emoji:💊', label: 'Medicine', group: 'emoji', tags: ['pill', 'prescription', 'pharmacy', 'health'], isEmoji: true, emojiChar: '💊' },
  { id: 'emoji:🎓', label: 'Graduation', group: 'emoji', tags: ['school', 'college', 'degree', 'education', 'study'], isEmoji: true, emojiChar: '🎓' },
  { id: 'emoji:💼', label: 'Briefcase', group: 'emoji', tags: ['work', 'job', 'business', 'office', 'career'], isEmoji: true, emojiChar: '💼' },
  { id: 'emoji:👶', label: 'Baby / Kids', group: 'emoji', tags: ['baby', 'child', 'kids', 'family'], isEmoji: true, emojiChar: '👶' },
  { id: 'emoji:🐾', label: 'Pets', group: 'emoji', tags: ['pet', 'dog', 'cat', 'animal', 'vet'], isEmoji: true, emojiChar: '🐾' },
  { id: 'emoji:🍕', label: 'Food', group: 'emoji', tags: ['food', 'dining', 'restaurant', 'meal', 'pizza'], isEmoji: true, emojiChar: '🍕' },
  { id: 'emoji:☕', label: 'Coffee', group: 'emoji', tags: ['coffee', 'cafe', 'break', 'work', 'tea'], isEmoji: true, emojiChar: '☕' },

  // Media & Docs
  { id: 'emoji:🍿', label: 'Movies', group: 'emoji', tags: ['movie', 'film', 'cinema', 'netflix', 'show'], isEmoji: true, emojiChar: '🍿' },
  { id: 'emoji:🎵', label: 'Music', group: 'emoji', tags: ['music', 'song', 'spotify', 'audio'], isEmoji: true, emojiChar: '🎵' },
  { id: 'emoji:🎨', label: 'Art', group: 'emoji', tags: ['art', 'design', 'creative', 'paint'], isEmoji: true, emojiChar: '🎨' },
  { id: 'emoji:⚽', label: 'Sports', group: 'emoji', tags: ['sports', 'soccer', 'football', 'fitness'], isEmoji: true, emojiChar: '⚽' },
  { id: 'emoji:📚', label: 'Books', group: 'emoji', tags: ['book', 'library', 'reading', 'study'], isEmoji: true, emojiChar: '📚' },
  { id: 'emoji:📦', label: 'Package', group: 'emoji', tags: ['package', 'box', 'order', 'shipping', 'delivery'], isEmoji: true, emojiChar: '📦' },
  { id: 'emoji:📝', label: 'Note', group: 'emoji', tags: ['note', 'memo', 'writing', 'doc'], isEmoji: true, emojiChar: '📝' },
  { id: 'emoji:🎁', label: 'Gift', group: 'emoji', tags: ['gift', 'present', 'reward', 'birthday'], isEmoji: true, emojiChar: '🎁' },
];

export const ALL_SEARCHABLE_ICONS: CuratedIconItem[] = [
  ...CURATED_CATEGORY_ICONS,
  ...CURATED_EMOJI_ICONS,
];

export const CURATED_CATEGORY_COLORS = [
  { hex: '#3B82F6', name: 'Blue' },
  { hex: '#8B5CF6', name: 'Purple' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#10B981', name: 'Emerald' },
  { hex: '#F59E0B', name: 'Amber' },
  { hex: '#EF4444', name: 'Crimson' },
  { hex: '#06B6D4', name: 'Cyan' },
  { hex: '#6366F1', name: 'Indigo' },
];

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  login: {
    category: 'login',
    name: 'Logins',
    color: '#FFB703', // 🟡 Gold Yellow: Logins
    bgTint: 'rgba(255, 183, 3, 0.12)',
    icon: KeyRound,
  },
  card: {
    category: 'card',
    name: 'Cards',
    color: '#E91E63', // 💖 Magenta Pink: Cards
    bgTint: 'rgba(233, 30, 99, 0.12)',
    icon: CreditCard,
  },
  note: {
    category: 'note',
    name: 'Notes',
    color: '#7C4DFF', // 🟣 Purple: Notes
    bgTint: 'rgba(124, 77, 255, 0.12)',
    icon: StickyNote,
  },
  other: {
    category: 'other',
    name: 'Other',
    color: '#64748B', // ⚪ Slate: Other
    bgTint: 'rgba(100, 116, 139, 0.12)',
    icon: Folder,
  },
};

export function getCategoryDetails(
  categoryId: string,
  customCategories?: CustomCategoryDefinition[]
): {
  id: string;
  name: string;
  color: string;
  bgTint: string;
  icon: any;
  isCustom: boolean;
  fields?: any[];
} {
  if (customCategories) {
    const custom = customCategories.find((c) => c.id === categoryId);
    if (custom) {
      const IconComponent = getCategoryIcon(custom.icon);
      return {
        id: custom.id,
        name: custom.name,
        color: custom.color,
        bgTint: custom.bgTint || `${custom.color}1F`,
        icon: IconComponent,
        isCustom: true,
        fields: custom.fields,
      };
    }
  }

  const builtin = CATEGORY_THEMES[categoryId] || CATEGORY_THEMES.other;
  return {
    id: categoryId,
    name: builtin.name,
    color: builtin.color,
    bgTint: builtin.bgTint,
    icon: builtin.icon,
    isCustom: false,
  };
}

export function getItemBadgeTheme(
  item: { category: ItemCategory; title?: string },
  customCategories?: CustomCategoryDefinition[]
) {
  const details = getCategoryDetails(item.category, customCategories);
  return {
    icon: details.icon,
    color: details.color,
    bgTint: details.bgTint,
    label: details.name,
  };
}
