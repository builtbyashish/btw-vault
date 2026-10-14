import {
  KeyRound,
  CreditCard,
  StickyNote,
  Folder,
  ShieldCheck,
  Smartphone,
  Server,
  Terminal,
  Wifi,
  Wallet,
  Lock,
  FileCode,
  Database,
  Landmark,
  Cpu,
  Globe,
  Hash,
  Layers,
  Bookmark,
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

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  KeyRound,
  CreditCard,
  StickyNote,
  Folder,
  ShieldCheck,
  Smartphone,
  Server,
  Terminal,
  Wifi,
  Wallet,
  Lock,
  FileCode,
  Database,
  Landmark,
  Cpu,
  Globe,
  Hash,
  Layers,
  Bookmark,
};

export const CURATED_CATEGORY_ICONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'KeyRound', label: 'Key', icon: KeyRound },
  { id: 'ShieldCheck', label: 'Shield', icon: ShieldCheck },
  { id: 'Smartphone', label: 'Phone', icon: Smartphone },
  { id: 'Server', label: 'Server', icon: Server },
  { id: 'Terminal', label: 'CLI', icon: Terminal },
  { id: 'Wifi', label: 'Wi-Fi', icon: Wifi },
  { id: 'Wallet', label: 'Wallet', icon: Wallet },
  { id: 'Lock', label: 'Lock', icon: Lock },
  { id: 'FileCode', label: 'Code', icon: FileCode },
  { id: 'Database', label: 'Database', icon: Database },
  { id: 'Landmark', label: 'Bank', icon: Landmark },
  { id: 'Cpu', label: 'CPU', icon: Cpu },
  { id: 'Globe', label: 'Web', icon: Globe },
  { id: 'Hash', label: 'Hash', icon: Hash },
  { id: 'Layers', label: 'Tokens', icon: Layers },
  { id: 'Bookmark', label: 'Bookmark', icon: Bookmark },
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
  icon: LucideIcon;
  isCustom: boolean;
  fields?: any[];
} {
  if (customCategories) {
    const custom = customCategories.find((c) => c.id === categoryId);
    if (custom) {
      const IconComponent = CATEGORY_ICON_MAP[custom.icon] || Folder;
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
