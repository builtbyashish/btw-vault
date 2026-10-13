import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ShieldOff,
  LayoutGrid,
  KeyRound,
  CreditCard,
  StickyNote,
  Pin,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVault } from '../../src/context/VaultContext';
import { VaultCard } from '../../src/components/VaultCard';
import { DynamicVaultCard } from '../../src/components/DynamicVaultCard';
import { CredCardDeck } from '../../src/components/CredCardDeck';
import { ItemActionSheet } from '../../src/components/ItemActionSheet';
import { SpeedDialFAB, SpeedDialFABRef } from '../../src/components/SpeedDialFAB';
import { VaultItem } from '../../src/types';
import { HapticService } from '../../src/core/haptics';
import { useSensitiveAuth } from '../../src/components/SensitiveAuthModal';

interface FilterCategoryConfig {
  id: string;
  label: string;
  color: string;
  bgTint: string;
  icon: any;
}

// 4 categories + 'All' matching FAB colors and iconography
const FILTER_CATEGORIES: FilterCategoryConfig[] = [
  {
    id: 'all',
    label: 'All',
    color: '#1C1C1E',
    bgTint: '#F2F2F7',
    icon: LayoutGrid,
  },
  {
    id: 'login',
    label: 'Logins',
    color: '#FFB703', // 🟡 Gold Yellow
    bgTint: 'rgba(255, 183, 3, 0.15)',
    icon: KeyRound,
  },
  {
    id: 'card',
    label: 'Cards',
    color: '#E91E63', // 💖 Magenta Pink
    bgTint: 'rgba(233, 30, 99, 0.15)',
    icon: CreditCard,
  },
  {
    id: 'note',
    label: 'Notes',
    color: '#7C4DFF', // 🟣 Purple
    bgTint: 'rgba(124, 77, 255, 0.15)',
    icon: StickyNote,
  },
];

export default function VaultHomeScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const { items, selectedCategory, setSelectedCategory, viewMode, togglePinItem, deleteItem } = useVault();
  const { requireAuth, AuthModal } = useSensitiveAuth();
  const router = useRouter();
  const speedDialRef = useRef<SpeedDialFABRef>(null);
  const [activeItemForMenu, setActiveItemForMenu] = useState<VaultItem | null>(null);

  // Scroll tracking for stacking cards on scroll
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Card layout geometry for scroll-driven stacking math
  const cardWidth = Math.min(windowWidth - 32, 500);
  const cardHeight = cardWidth / 1.6;
  const cardStep = cardHeight + 16;
  const viewportHeight = windowHeight - 160 - (insets.bottom || 0);

  const handleLongPressItem = async (item: VaultItem) => {
    await HapticService.impactMedium();
    setActiveItemForMenu(item);
  };

  // Category counts computed reactively from vault items
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {
      all: items.length,
      login: 0,
      card: 0,
      note: 0,
    };
    items.forEach((item) => {
      const catKey = (item.category === 'other' || item.category === 'note') ? 'note' : item.category;
      if (map[catKey] !== undefined) {
        map[catKey]++;
      }
    });
    return map;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item: VaultItem) => {
      if (selectedCategory !== 'all') {
        const itemCat = (item.category === 'other' || item.category === 'note') ? 'note' : item.category;
        if (itemCat !== selectedCategory) {
          return false;
        }
      }
      return true;
    });
  }, [items, selectedCategory]);

  // Split filtered items into pinned and unpinned
  const { pinnedItems, unpinnedItems } = useMemo(() => {
    const pinned: VaultItem[] = [];
    const unpinned: VaultItem[] = [];
    filteredItems.forEach((item: VaultItem) => {
      if (item.isPinned) {
        pinned.push(item);
      } else {
        unpinned.push(item);
      }
    });
    return { pinnedItems: pinned, unpinnedItems: unpinned };
  }, [filteredItems]);

  const distributeMasonryColumns = (list: VaultItem[]) => {
    const left: VaultItem[] = [];
    const right: VaultItem[] = [];
    let leftHeight = 0;
    let rightHeight = 0;

    list.forEach((item: VaultItem) => {
      let estimatedHeight = 110;

      if (item.category === 'card') {
        estimatedHeight = 120;
      } else if (item.category === 'login') {
        estimatedHeight = 85;
        if (item.username) estimatedHeight += 32;
        if (item.password) estimatedHeight += 32;
        if (item.tags && item.tags.length > 0) estimatedHeight += 20;
      } else if (item.category === 'note' || item.category === 'other') {
        const charCount = item.notes?.length || 0;
        const textLines = Math.min(Math.ceil(charCount / 22), 8);
        estimatedHeight = 55 + textLines * 18;
        if (item.noteSections && item.noteSections.length > 0) {
          estimatedHeight += Math.min(item.noteSections.length, 2) * 36;
        }
        if (item.tags && item.tags.length > 0) estimatedHeight += 20;
      } else {
        estimatedHeight = 80;
        if (item.notes) estimatedHeight += 30;
      }

      // Add to shorter column (greedy masonry balancing)
      if (leftHeight <= rightHeight) {
        left.push(item);
        leftHeight += estimatedHeight + 10;
      } else {
        right.push(item);
        rightHeight += estimatedHeight + 10;
      }
    });

    return { leftColumn: left, rightColumn: right };
  };

  const pinnedMasonry = useMemo(() => distributeMasonryColumns(pinnedItems), [pinnedItems]);
  const unpinnedMasonry = useMemo(() => distributeMasonryColumns(unpinnedItems), [unpinnedItems]);

  const cardItems = useMemo(() => {
    return [...pinnedItems, ...unpinnedItems];
  }, [pinnedItems, unpinnedItems]);

  const handleSelectCategory = (catId: string) => {
    HapticService.selection();
    scrollY.setValue(0);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    if (selectedCategory === catId && catId !== 'all') {
      setSelectedCategory('all');
    } else {
      setSelectedCategory(catId);
    }
  };

  useEffect(() => {
    scrollY.setValue(0);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [selectedCategory]);

  const renderTopFilterRail = () => {
    return (
      <View style={styles.filterRailWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRailScrollContent}
        >
          {FILTER_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;
            const IconComponent = cat.icon;

            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.filterChip,
                  isSelected && [
                    styles.filterChipSelected,
                    {
                      backgroundColor: cat.color,
                      shadowColor: cat.color,
                    },
                  ],
                ]}
                onPress={() => handleSelectCategory(cat.id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${cat.label}, ${count} items`}
                accessibilityState={{ selected: isSelected }}
              >
                {/* Circular Icon Avatar with Category Accent */}
                <View
                  style={[
                    styles.chipIconSquircle,
                    {
                      backgroundColor: isSelected
                        ? 'rgba(255, 255, 255, 0.25)'
                        : cat.bgTint,
                    },
                  ]}
                >
                  <IconComponent
                    size={12}
                    color={isSelected ? '#FFFFFF' : cat.color}
                    strokeWidth={2.4}
                  />
                </View>

                {/* Category Name */}
                <Text
                  style={[
                    styles.chipLabel,
                    isSelected && styles.chipLabelSelected,
                  ]}
                >
                  {cat.label}
                </Text>

                {/* Count Badge */}
                <View
                  style={[
                    styles.chipCountBadge,
                    isSelected && styles.chipCountBadgeSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipCountText,
                      isSelected && styles.chipCountTextSelected,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderEmptyState = () => (
    <TouchableOpacity
      style={styles.emptyContainer}
      onPress={() => speedDialRef.current?.open()}
      activeOpacity={0.5}
    >
      <ShieldOff color="#C7C7CC" size={48} style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>
        {selectedCategory === 'all'
          ? 'Your vault is empty'
          : 'No items in this category'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {selectedCategory === 'all'
          ? 'Tap the + button below to add your first item.'
          : 'Tap the + button below to add one.'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, viewMode === 'dynamic' && styles.dynamicContainer]}>
      {/* Pinned Top Category Filter Rail */}
      {renderTopFilterRail()}

      {/* Main Vault Feed */}
      {viewMode === 'dynamic' ? (
        selectedCategory === 'card' ? (
          filteredItems.length === 0 ? (
            renderEmptyState()
          ) : (
            <CredCardDeck
              cards={cardItems}
              activeItemForMenu={activeItemForMenu}
              onPressCard={(item) => router.push(`/item/${item.id}`)}
              onLongPressCard={(item) => handleLongPressItem(item)}
              onRequireAuth={requireAuth}
            />
          )
        ) : (
          <Animated.ScrollView
            ref={scrollViewRef as any}
            contentContainerStyle={[
              styles.dynamicScrollContent,
              {
                paddingTop: 10,
                paddingBottom: (insets.bottom || 0) + 120,
              },
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
          >
            {filteredItems.length === 0 ? (
              renderEmptyState()
            ) : pinnedItems.length > 0 ? (
            <>
              {/* Pinned Section */}
              <View style={styles.sectionHeaderRow}>
                <Pin size={11} color="#D97706" fill="#D97706" />
                <Text style={styles.sectionHeaderText}>PINNED</Text>
              </View>
              <View style={styles.twoColumnGrid}>
                {/* Left Column (Pinned) */}
                <View style={styles.gridColumn}>
                  {pinnedMasonry.leftColumn.map((item, idx) => (
                    <DynamicVaultCard
                      key={item.id}
                      item={item}
                      index={idx}
                      isMenuTarget={activeItemForMenu?.id === item.id}
                      onPress={() => router.push(`/item/${item.id}`)}
                      onLongPress={() => handleLongPressItem(item)}
                      onRequireAuth={requireAuth}
                    />
                  ))}
                </View>

                {/* Right Column (Pinned) */}
                <View style={styles.gridColumn}>
                  {pinnedMasonry.rightColumn.map((item, idx) => (
                    <DynamicVaultCard
                      key={item.id}
                      item={item}
                      index={idx + 1}
                      isMenuTarget={activeItemForMenu?.id === item.id}
                      onPress={() => router.push(`/item/${item.id}`)}
                      onLongPress={() => handleLongPressItem(item)}
                      onRequireAuth={requireAuth}
                    />
                  ))}
                </View>
              </View>

              {/* Others Section */}
              {unpinnedItems.length > 0 && (
                <>
                  <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
                    <Text style={styles.sectionHeaderText}>OTHERS</Text>
                  </View>
                  <View style={styles.twoColumnGrid}>
                    {/* Left Column (Others) */}
                    <View style={styles.gridColumn}>
                      {unpinnedMasonry.leftColumn.map((item, idx) => (
                        <DynamicVaultCard
                          key={item.id}
                          item={item}
                          index={idx}
                          isMenuTarget={activeItemForMenu?.id === item.id}
                          onPress={() => router.push(`/item/${item.id}`)}
                          onLongPress={() => handleLongPressItem(item)}
                          onRequireAuth={requireAuth}
                        />
                      ))}
                    </View>

                    {/* Right Column (Others) */}
                    <View style={styles.gridColumn}>
                      {unpinnedMasonry.rightColumn.map((item, idx) => (
                        <DynamicVaultCard
                          key={item.id}
                          item={item}
                          index={idx + 1}
                          isMenuTarget={activeItemForMenu?.id === item.id}
                          onPress={() => router.push(`/item/${item.id}`)}
                          onLongPress={() => handleLongPressItem(item)}
                          onRequireAuth={requireAuth}
                        />
                      ))}
                    </View>
                  </View>
                </>
              )}
            </>
          ) : (
            <View style={styles.twoColumnGrid}>
              {/* Left Column */}
              <View style={styles.gridColumn}>
                {unpinnedMasonry.leftColumn.map((item, idx) => (
                  <DynamicVaultCard
                    key={item.id}
                    item={item}
                    index={idx}
                    isMenuTarget={activeItemForMenu?.id === item.id}
                    onPress={() => router.push(`/item/${item.id}`)}
                    onLongPress={() => handleLongPressItem(item)}
                    onRequireAuth={requireAuth}
                  />
                ))}
              </View>

              {/* Right Column */}
              <View style={styles.gridColumn}>
                {unpinnedMasonry.rightColumn.map((item, idx) => (
                  <DynamicVaultCard
                    key={item.id}
                    item={item}
                    index={idx + 1}
                    isMenuTarget={activeItemForMenu?.id === item.id}
                    onPress={() => router.push(`/item/${item.id}`)}
                    onLongPress={() => handleLongPressItem(item)}
                    onRequireAuth={requireAuth}
                  />
                ))}
              </View>
            </View>
          )}
        </Animated.ScrollView>
        )
      ) : (
        <FlatList
          data={[...pinnedItems, ...unpinnedItems]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingTop: 4,
              paddingBottom: (insets.bottom || 0) + 100,
            },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <VaultCard
              item={item}
              isMenuTarget={activeItemForMenu?.id === item.id}
              onPress={() => router.push(`/item/${item.id}`)}
              onLongPress={() => handleLongPressItem(item)}
            />
          )}
          ListEmptyComponent={renderEmptyState()}
        />
      )}

      {/* Google Keep-style Floating Action Button with Speed Dial */}
      <SpeedDialFAB
        ref={speedDialRef}
        onSelectOption={(category) => {
          router.push({ pathname: '/item/create', params: { type: category } });
        }}
      />

      <ItemActionSheet
        visible={!!activeItemForMenu}
        item={activeItemForMenu}
        onClose={() => setActiveItemForMenu(null)}
        onTogglePin={async (item) => {
          await togglePinItem(item.id);
        }}
        onDelete={async (item) => {
          await deleteItem(item.id);
        }}
      />

      {AuthModal}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  dynamicContainer: {
    backgroundColor: '#F2F2F7',
  },
  // --- Top Category Filter Rail ---
  filterRailWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    paddingVertical: 9,
  },
  filterRailScrollContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 7,
    paddingRight: 10,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipSelected: {
    borderWidth: 1,
    borderColor: 'transparent',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  chipIconSquircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  chipLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipCountBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 9,
    backgroundColor: '#E5E7EB',
  },
  chipCountBadgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  chipCountText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#4B5563',
  },
  chipCountTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  // --- Feed & Masonry Grid ---
  listContent: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 120,
  },
  dynamicScrollContent: {
    paddingTop: 8,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 10,
    alignItems: 'flex-start',
  },
  gridColumn: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardsSingleColFeed: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
});
