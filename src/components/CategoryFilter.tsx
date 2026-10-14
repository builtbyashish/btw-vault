import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Modal,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoreHorizontal, X, Check } from 'lucide-react-native';
import { VaultItem, CustomCategoryDefinition } from '../types';
import { CATEGORY_THEMES, CATEGORY_ICON_MAP } from '../theme/categoryColors';

export interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  items?: VaultItem[];
  customCategories?: CustomCategoryDefinition[];
  pinnedCategoryIds?: string[];
}

export function CategoryFilter({
  selectedCategory,
  onSelectCategory,
  items,
  customCategories = [],
  pinnedCategoryIds,
}: CategoryFilterProps) {
  const [isMoreModalOpen, setIsMoreModalOpen] = useState(false);

  const allCategories = useMemo(() => {
    const builtins = [
      { id: 'all', label: 'All', color: '#007AFF' },
      { id: 'login', label: 'Logins', color: CATEGORY_THEMES.login.color },
      { id: 'card', label: 'Cards', color: CATEGORY_THEMES.card.color },
      { id: 'note', label: 'Notes', color: CATEGORY_THEMES.note.color },
    ];
    const customs = customCategories.map((c) => ({
      id: c.id,
      label: c.name,
      color: c.color,
    }));
    return [...builtins, ...customs];
  }, [customCategories]);

  const { directCategories, moreCategories } = useMemo(() => {
    if (!pinnedCategoryIds) {
      if (allCategories.length <= 5) {
        return { directCategories: allCategories, moreCategories: [] };
      }
      return {
        directCategories: allCategories.slice(0, 5),
        moreCategories: allCategories.slice(5),
      };
    }

    const pinned = pinnedCategoryIds
      .map((id) => allCategories.find((c) => c.id === id))
      .filter((c): c is { id: string; label: string; color: string } => Boolean(c));

    if (!pinned.some((p) => p.id === 'all')) {
      const allItem = allCategories.find((c) => c.id === 'all');
      if (allItem) pinned.unshift(allItem);
    }

    const direct = pinned.slice(0, 5);
    const more = allCategories.filter((c) => !direct.some((d) => d.id === c.id));
    return { directCategories: direct, moreCategories: more };
  }, [allCategories, pinnedCategoryIds]);

  const selectedMoreCategory = useMemo(() => {
    return moreCategories.find(
      (c) =>
        c.id === selectedCategory.toLowerCase() ||
        c.label.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [moreCategories, selectedCategory]);

  const getCount = (id: string) => {
    if (!items) return null;
    if (id === 'all') return items.length;
    if (id === 'note') return items.filter((i) => i.category === 'note' || i.category === 'other').length;
    return items.filter((i) => i.category === id).length;
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {directCategories.map((cat) => {
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

        {moreCategories.length > 0 && (
          <TouchableOpacity
            style={[
              styles.chip,
              Boolean(selectedMoreCategory) && {
                backgroundColor: selectedMoreCategory?.color || '#64748B',
                borderColor: selectedMoreCategory?.color || '#64748B',
              },
            ]}
            onPress={() => setIsMoreModalOpen(true)}
            activeOpacity={0.5}
          >
            <MoreHorizontal
              size={14}
              color={selectedMoreCategory ? '#FFFFFF' : '#64748B'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.text,
                Boolean(selectedMoreCategory) && styles.textSelected,
              ]}
            >
              {selectedMoreCategory ? selectedMoreCategory.label : `More (${moreCategories.length})`}
            </Text>
            {selectedMoreCategory && getCount(selectedMoreCategory.id) !== null && (
              <View style={[styles.badge, styles.badgeSelected]}>
                <Text style={[styles.badgeText, styles.badgeTextSelected]}>
                  {getCount(selectedMoreCategory.id)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* More Modal */}
      <Modal
        visible={isMoreModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMoreModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsMoreModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalSheet}>
                <View style={styles.modalIndicator} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>All Categories</Text>
                  <TouchableOpacity
                    onPress={() => setIsMoreModalOpen(false)}
                    style={styles.modalCloseBtn}
                  >
                    <X color="#8E8E93" size={18} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: 350 }}>
                  {allCategories.map((cat) => {
                    const isSelected =
                      selectedCategory.toLowerCase() === cat.id ||
                      selectedCategory.toLowerCase() === cat.label.toLowerCase();
                    const count = getCount(cat.id);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.modalRow, isSelected && styles.modalRowSelected]}
                        onPress={() => {
                          onSelectCategory(cat.id);
                          setIsMoreModalOpen(false);
                        }}
                      >
                        <View style={[styles.modalDot, { backgroundColor: cat.color }]} />
                        <Text style={[styles.modalRowLabel, isSelected && { fontWeight: '700', color: cat.color }]}>
                          {cat.label}
                        </Text>
                        {count !== null && (
                          <View style={styles.modalBadge}>
                            <Text style={styles.modalBadgeText}>{count}</Text>
                          </View>
                        )}
                        {isSelected && <Check color={cat.color} size={18} style={{ marginLeft: 8 }} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <SafeAreaView edges={['bottom']} />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
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
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 20,
  },
  modalIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    alignSelf: 'center',
    marginVertical: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
  },
  modalRowSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  modalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  modalRowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },
  modalBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  modalBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
});
