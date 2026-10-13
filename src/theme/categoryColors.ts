import { KeyRound, CreditCard, StickyNote } from 'lucide-react-native';
import { ItemCategory } from '../types';

export interface CategoryTheme {
  category: ItemCategory;
  name: string;
  color: string;      // Primary vibrant hex
  bgTint: string;     // Soft pastel tint background
  icon: any;
}

export const CATEGORY_THEMES: Record<ItemCategory, CategoryTheme> = {
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
    name: 'Notes',
    color: '#7C4DFF', // 🟣 Purple: Notes
    bgTint: 'rgba(124, 77, 255, 0.12)',
    icon: StickyNote,
  },
};

export function getItemBadgeTheme(item: { category: ItemCategory; title?: string }) {
  const theme = CATEGORY_THEMES[item.category] || CATEGORY_THEMES.login;
  return {
    icon: theme.icon,
    color: theme.color,
    bgTint: theme.bgTint,
    label: theme.name,
  };
}
