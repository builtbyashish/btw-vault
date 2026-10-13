import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VaultItem } from '../types';
import { DynamicVaultCard } from './DynamicVaultCard';
import { HapticService } from '../core/haptics';

interface CredCardDeckProps {
  cards: VaultItem[];
  activeItemForMenu: VaultItem | null;
  onPressCard: (item: VaultItem) => void;
  onLongPressCard: (item: VaultItem) => void;
  onRequireAuth?: (reason: string) => Promise<boolean>;
}

const SNAP_STEP = 210; // Scroll distance per card transition
const ACTIVE_Y = 46; // Focused card resting Y
const TOP_PEEK = 38; // Header peek for docked top cards
const BOTTOM_PEEK = 44; // Header peek for bottom-stacked cards

export const CredCardDeck: React.FC<CredCardDeckProps> = ({
  cards,
  activeItemForMenu,
  onPressCard,
  onLongPressCard,
  onRequireAuth,
}) => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);

  // Card geometry matching reference image aspect ratio 1.6
  const cardWidth = Math.min(windowWidth - 32, 500);
  const cardHeight = cardWidth / 1.6;

  // Bottom stack resting base Y (comfortably clears active card)
  const bottomStackBaseY = Math.max(296, ACTIVE_Y + cardHeight + 18);

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Sync activeIndex if cards change
  useEffect(() => {
    if (activeIndex >= cards.length) {
      const clamped = Math.max(0, cards.length - 1);
      setActiveIndex(clamped);
      activeIndexRef.current = clamped;
    }
  }, [cards.length]);

  const updateActiveIndexFromY = (y: number) => {
    if (cards.length === 0) return;
    const newIndex = Math.min(
      Math.max(0, Math.round(y / SNAP_STEP)),
      cards.length - 1
    );
    if (newIndex !== activeIndexRef.current) {
      activeIndexRef.current = newIndex;
      setActiveIndex(newIndex);
      HapticService.selection();
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        updateActiveIndexFromY(e.nativeEvent.contentOffset.y);
      },
    }
  );

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    updateActiveIndexFromY(e.nativeEvent.contentOffset.y);
  };

  const handleCardPress = (item: VaultItem, index: number) => {
    if (index === activeIndex) {
      // Tapping active card navigates to detail view
      onPressCard(item);
    } else {
      // Tapping stacked card smoothly scrolls it into focus
      HapticService.selection();
      scrollViewRef.current?.scrollTo({
        y: index * SNAP_STEP,
        animated: true,
      });
    }
  };

  // Target on-screen Y position for card `cardIdx` when `activeIdx` is focused
  const getTargetScreenY = (cardIdx: number, activeIdx: number): number => {
    if (cardIdx < activeIdx) {
      // Docked in Top Stack
      return cardIdx * TOP_PEEK;
    }
    if (cardIdx === activeIdx) {
      // Focused active card
      return ACTIVE_Y;
    }
    // Resting in Bottom Stack
    const offsetBelow = cardIdx - activeIdx - 1;
    return bottomStackBaseY + offsetBelow * BOTTOM_PEEK;
  };

  const viewportHeight = Math.max(windowHeight - 200, 540);
  const scrollContentHeight = Math.max(
    (cards.length - 1) * SNAP_STEP + viewportHeight,
    viewportHeight
  );

  return (
    <View style={styles.deckOuterContainer}>


      {/* Scrollable Container with Native Snapping */}
      <Animated.ScrollView
        ref={scrollViewRef as any}
        style={styles.deckScrollView}
        contentContainerStyle={[
          styles.deckScrollContent,
          {
            height: scrollContentHeight,
            paddingBottom: (insets.bottom || 0) + 100,
          },
        ]}
        snapToInterval={SNAP_STEP}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      >
        {cards.map((item, index) => {
          const isCardActive = index === activeIndex;
          const isTarget = activeItemForMenu?.id === item.id;

          // Build piecewise linear interpolation for translateY
          const yInputRange: number[] = [];
          const yOutputRange: number[] = [];

          // Overscroll top point
          yInputRange.push(-SNAP_STEP);
          yOutputRange.push(getTargetScreenY(index, 0) - SNAP_STEP * 0.4);

          // Key points for each card state 0..N-1
          for (let k = 0; k < cards.length; k++) {
            const scrollOffset = k * SNAP_STEP;
            yInputRange.push(scrollOffset);
            // Y_screen = -scrollY + translateY => translateY = Y_screen + scrollOffset
            yOutputRange.push(getTargetScreenY(index, k) + scrollOffset);
          }

          // Overscroll bottom point
          yInputRange.push(cards.length * SNAP_STEP);
          yOutputRange.push(
            getTargetScreenY(index, cards.length - 1) +
            cards.length * SNAP_STEP +
            SNAP_STEP * 0.3
          );

          const cardTranslateY = scrollY.interpolate({
            inputRange: yInputRange,
            outputRange: yOutputRange,
            extrapolate: 'clamp',
          });

          // Build scale interpolation (active card = 1.0, stacked cards = 0.96)
          const scaleInputRange: number[] = [];
          const scaleOutputRange: number[] = [];

          scaleInputRange.push(-SNAP_STEP);
          scaleOutputRange.push(index === 0 ? 1.0 : 0.96);

          for (let k = 0; k < cards.length; k++) {
            scaleInputRange.push(k * SNAP_STEP);
            scaleOutputRange.push(k === index ? 1.0 : 0.96);
          }

          scaleInputRange.push(cards.length * SNAP_STEP);
          scaleOutputRange.push(index === cards.length - 1 ? 1.0 : 0.96);

          const cardScale = scrollY.interpolate({
            inputRange: scaleInputRange,
            outputRange: scaleOutputRange,
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={item.id}
              style={[
                styles.cardAbsoluteWrapper,
                {
                  transform: [
                    { translateY: cardTranslateY },
                    { scale: cardScale },
                  ],
                  zIndex: isTarget ? 100 : (index + 1) * 10,
                  elevation: isTarget ? 20 : isCardActive ? 12 : (index + 1) * 2,
                },
              ]}
            >
              <DynamicVaultCard
                item={item}
                index={index}
                fullWidth={true}
                isActive={isCardActive}
                isMenuTarget={isTarget}
                onPress={() => handleCardPress(item, index)}
                onLongPress={() => onLongPressCard(item)}
                onRequireAuth={onRequireAuth}
              />
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  deckOuterContainer: {
    flex: 1,
    width: '100%'
  },
  deckHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  deckHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  deckCounterPill: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  deckCounterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  deckScrollView: {
    flex: 1,
    width: '100%',
  },
  deckScrollContent: {
    position: 'relative',
    width: '100%',
  },
  cardAbsoluteWrapper: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
  },
});

export default CredCardDeck;
