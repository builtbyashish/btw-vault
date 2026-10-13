import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { VaultItem } from '../types';
import { CATEGORY_THEMES } from '../theme/categoryColors';

export interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  items?: VaultItem[];
}

const CATEGORIES = [
  { id: 'all', label: 'All', color: '#007AFF' },
  { id: 'login', label: 'Logins', color: CATEGORY_THEMES.login.color },          // 🟡 #FFB703
  { id: 'card', label: 'Cards', color: CATEGORY_THEMES.card.color },             // 💖 #E91E63
  { id: 'note', label: 'Notes', color: CATEGORY_THEMES.note.color },             // 🟣 #7C4DFF
];

export function CategoryFilter({
  selectedCategory,
  onSelectCategory,
  items,
}: CategoryFilterProps) {
  const getCount = (id: string) => {
    if (!items) return null;
    if (id === 'all') return items.length;
    if (id === 'note') return items.filter((i) => i.category === 'note' || i.category === 'other').length;
    return items.filter((i) => i.category === id).length;
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CATEGORIES.map((cat) => {
        const isSelected =
          selectedCategory.toLowerCase() === cat.id ||
          selectedCategory.toLowerCase() === cat.label.toLowerCase();
        const count = getCount(cat.id);

        return (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.chip,
              isSelected && { backgroundColor: cat.color, borderColor: cat.color },
            ]}
            onPress={() => onSelectCategory(cat.id)}
            activeOpacity={0.5}
          >
            {!isSelected && cat.id !== 'all' && (
              <View style={[styles.dot, { backgroundColor: cat.color }]} />
            )}

            <Text style={[styles.text, isSelected && styles.textSelected]}>
              {cat.label}
            </Text>

            {count !== null && (
              <View
                style={[
                  styles.badge,
                  isSelected && styles.badgeSelected,
                ]}
              >
                <Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>
                  {count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default CategoryFilter;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  textSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  badge: {
    marginLeft: 6,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  badgeTextSelected: {
    color: '#FFFFFF',
  },
});
