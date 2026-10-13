import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  X,
  Tag as TagIcon,
  SearchX,
} from 'lucide-react-native';
import { useVault } from '../src/context/VaultContext';
import { VaultCard } from '../src/components/VaultCard';
import { VaultItem, ItemCategory } from '../src/types';
import { CATEGORY_THEMES } from '../src/theme/categoryColors';

const DISPLAY_CATEGORIES: ItemCategory[] = ['login', 'card', 'note'];

export default function SearchScreen() {
  const router = useRouter();
  const { items } = useVault();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Category counts
  const countsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((item) => {
      const catKey = (item.category === 'other' || item.category === 'note') ? 'note' : item.category;
      map[catKey] = (map[catKey] || 0) + 1;
    });
    return map;
  }, [items]);

  // Unique tags with counts
  const tagListWithCounts = useMemo(() => {
    const tagMap: Record<string, number> = {};
    items.forEach((item) => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag) => {
          const clean = tag.trim();
          if (clean) {
            tagMap[clean] = (tagMap[clean] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(tagMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  // Filtered items based on query, selectedCategory, and selectedTag
  const filteredItems = useMemo(() => {
    const trimmedQuery = query.toLowerCase().trim();
    const isSearching = trimmedQuery.length > 0 || selectedCategory !== null || selectedTag !== null;

    if (!isSearching) {
      return [];
    }

    return items.filter((item: VaultItem) => {
      // Filter by category if selected
      if (selectedCategory !== null) {
        const itemCat = (item.category === 'other' || item.category === 'note') ? 'note' : item.category;
        if (itemCat !== selectedCategory) {
          return false;
        }
      }

      // Filter by tag if selected
      if (selectedTag !== null) {
        if (!item.tags || !item.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase())) {
          return false;
        }
      }

      // If no query string, match category and/or tag only
      if (!trimmedQuery) {
        return true;
      }

      // Keyword matching
      if (item.title.toLowerCase().includes(trimmedQuery)) return true;
      if (item.username && item.username.toLowerCase().includes(trimmedQuery)) return true;
      if (item.url && item.url.toLowerCase().includes(trimmedQuery)) return true;
      if (item.notes && item.notes.toLowerCase().includes(trimmedQuery)) return true;
      if (item.tags && item.tags.some((t) => t.toLowerCase().includes(trimmedQuery))) return true;
      if (item.additionalUrls && item.additionalUrls.some((u) => u.toLowerCase().includes(trimmedQuery))) return true;
      if (item.cardDetails) {
        if (item.cardDetails.cardholderName && item.cardDetails.cardholderName.toLowerCase().includes(trimmedQuery)) return true;
        if (item.cardDetails.cardBrand && item.cardDetails.cardBrand.toLowerCase().includes(trimmedQuery)) return true;
        if (item.cardDetails.cardNumber && item.cardDetails.cardNumber.includes(trimmedQuery)) return true;
      }
      if (item.noteSections && item.noteSections.some((s) => s.content.toLowerCase().includes(trimmedQuery) || (s.title && s.title.toLowerCase().includes(trimmedQuery)))) return true;
      if (item.customFields) {
        for (const cf of item.customFields) {
          if (cf.label.toLowerCase().includes(trimmedQuery)) return true;
          if (cf.type !== 'hidden' && cf.value.toLowerCase().includes(trimmedQuery)) return true;
        }
      }

      return false;
    });
  }, [items, query, selectedCategory, selectedTag]);

  const isSearchActive = query.trim().length > 0 || selectedCategory !== null || selectedTag !== null;

  const handleClear = () => {
    setQuery('');
    setSelectedCategory(null);
    setSelectedTag(null);
    inputRef.current?.focus();
  };

  const handleSelectCategory = (cat: ItemCategory) => {
    setSelectedCategory((prev) => (prev === cat ? null : cat));
  };

  const handleSelectTag = (tag: string) => {
    setSelectedTag((prev) => (prev === tag ? null : tag));
  };

  return (
    <View style={styles.screen}>
      {/* Top Google Keep-style search header */}
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.back()}
            activeOpacity={0.5}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <ArrowLeft size={22} color="#000000" strokeWidth={2.2} />
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search vault..."
            placeholderTextColor="#8E8E93"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={true}
            returnKeyType="search"
          />

          {isSearchActive ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleClear}
              activeOpacity={0.5}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <X size={20} color="#8E8E93" strokeWidth={2.2} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconPlaceholder} />
          )}
        </View>

        {/* Active filter chips row */}
        {(selectedCategory || selectedTag) && (
          <View style={styles.activeFiltersRow}>
            {selectedCategory && (
              <TouchableOpacity
                style={[
                  styles.activeChip,
                  { borderColor: CATEGORY_THEMES[selectedCategory].color },
                ]}
                onPress={() => setSelectedCategory(null)}
                activeOpacity={0.5}
              >
                <View
                  style={[
                    styles.chipDot,
                    { backgroundColor: CATEGORY_THEMES[selectedCategory].color },
                  ]}
                />
                <Text style={styles.activeChipText}>
                  {CATEGORY_THEMES[selectedCategory]?.name || selectedCategory}
                </Text>
                <X size={13} color="#000000" strokeWidth={2.5} />
              </TouchableOpacity>
            )}

            {selectedTag && (
              <TouchableOpacity
                style={styles.activeTagChip}
                onPress={() => setSelectedTag(null)}
                activeOpacity={0.5}
              >
                <TagIcon size={12} color="#007AFF" />
                <Text style={styles.activeTagChipText}>#{selectedTag}</Text>
                <X size={13} color="#007AFF" strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </SafeAreaView>

      {/* Main Content: Keep Facets (when inactive) or Search Results (when active) */}
      {!isSearchActive ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Types Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TYPES</Text>
            <View style={styles.typesGrid}>
              {DISPLAY_CATEGORIES.map((catKey) => {
                const theme = CATEGORY_THEMES[catKey];
                const IconComponent = theme.icon;
                const count = countsByCategory[catKey] || 0;

                return (
                  <TouchableOpacity
                    key={catKey}
                    style={styles.typeTile}
                    onPress={() => handleSelectCategory(catKey)}
                    activeOpacity={0.5}
                  >
                    <View style={[styles.typeIconContainer, { backgroundColor: theme.color }]}>
                      <IconComponent color="#FFFFFF" size={18} strokeWidth={2.2} />
                    </View>
                    <View style={styles.typeTextGroup}>
                      <Text style={styles.typeTitle} numberOfLines={1}>
                        {theme.name}
                      </Text>
                      <Text style={styles.typeCount}>
                        {count} {count === 1 ? 'item' : 'items'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Tags Section (if any exist) */}
          {tagListWithCounts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TAGS</Text>
              <View style={styles.tagsWrap}>
                {tagListWithCounts.map(({ tag, count }) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.tagTile}
                    onPress={() => handleSelectTag(tag)}
                    activeOpacity={0.5}
                  >
                    <TagIcon size={13} color="#8E8E93" />
                    <Text style={styles.tagLabel}>#{tag}</Text>
                    <View style={styles.tagCountBadge}>
                      <Text style={styles.tagCountText}>{count}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          style={styles.container}
          contentContainerStyle={styles.resultsContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            filteredItems.length > 0 ? (
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCountText}>
                  {filteredItems.length} {filteredItems.length === 1 ? 'RESULT' : 'RESULTS'}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <VaultCard
              item={item}
              onPress={() => router.push(`/item/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <SearchX color="#C7C7CC" size={48} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>No matching items</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search terms or clearing the selected category filters.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  headerSafeArea: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  headerBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  iconPlaceholder: {
    width: 44,
    height: 44,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 17,
    color: '#000000',
    paddingHorizontal: 8,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 2,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  activeTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF3FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  activeTagChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingLeft: 2,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeTile: {
    width: '48.4%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  typeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  typeTextGroup: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 1,
  },
  typeCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  tagLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000000',
  },
  tagCountBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  tagCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  resultsContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});
