import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { ChevronRight, Pin } from 'lucide-react-native';
import { VaultItem } from '../types';
import { getItemBadgeTheme } from '../theme/categoryColors';
import { CardNetworkLogo } from '../card-validator/logos';
import { resolveCardTheme } from '../card-validator/theme';

interface VaultCardProps {
  item: VaultItem;
  isMenuTarget?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

export const VaultCard: React.FC<VaultCardProps> = ({
  item,
  isMenuTarget = false,
  onPress,
  onLongPress,
}) => {
  const badgeTheme = getItemBadgeTheme(item);
  const IconComponent = badgeTheme.icon;
  const isCard = item.category === 'card';
  const cardTheme = isCard
    ? resolveCardTheme(item.cardDetails?.cardBrand, item.cardDetails?.cardNumber)
    : null;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isMenuTarget) {
      Animated.spring(scaleAnim, {
        toValue: 1.025,
        friction: 6.5,
        tension: 120,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 130,
        useNativeDriver: true,
      }).start();
    }
  }, [isMenuTarget]);

  const handleLongPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.035,
        duration: 120,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1.025,
        friction: 6.5,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
    if (onLongPress) onLongPress();
  };

  const getSubtitle = () => {
    if (item.category === 'card' && item.cardDetails?.cardNumber) {
      const clean = item.cardDetails.cardNumber.replace(/\s+/g, '');
      const last4 = clean.slice(-4);
      const brand = (item.cardDetails.cardBrand || 'Card').toUpperCase();
      return `•••• ${last4 || '••••'} • ${brand}`;
    }

    if (item.category === 'note' || item.category === 'other') {
      if (item.notes) {
        return item.notes
          .replace(/^\[[ x]\]\s*/gm, '• ')
          .replace(/\n+/g, ' ')
          .slice(0, 45);
      }
      return 'Note';
    }

    // Default (Login)
    return item.username || item.url || (item.notes ? item.notes.replace(/\n+/g, ' ').slice(0, 30) : 'Added recently');
  };

  const isCustomColor =
    (item.category === 'note' || item.category === 'other') &&
    item.color &&
    item.color.toLowerCase() !== '#ffffff';

  return (
    <Animated.View
      style={[
        styles.animatedRowWrapper,
        {
          transform: [{ scale: scaleAnim }],
          zIndex: isMenuTarget ? 25 : 1,
          elevation: isMenuTarget ? 8 : 1,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.container,
          isCustomColor ? { backgroundColor: item.color, borderColor: 'rgba(0,0,0,0.08)' } : null,
          isMenuTarget && styles.containerActive,
        ]}
        onPress={onPress}
        onLongPress={handleLongPress}
        delayLongPress={300}
        activeOpacity={0.7}
      >
        {/* Category circular colored badge */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isCard && cardTheme ? cardTheme.start : badgeTheme.color,
              shadowColor: isCard && cardTheme ? cardTheme.shadow : '#000000',
            },
          ]}
        >
          {isCard && cardTheme ? (
            <CardNetworkLogo network={cardTheme.effectiveNetwork} size={18} />
          ) : (
            <IconComponent color="#FFFFFF" size={18} />
          )}
        </View>

        <View style={styles.details}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            {item.isPinned && (
              <View style={styles.pinIconWrapper}>
                <Pin size={11} color="#D97706" fill="#D97706" />
              </View>
            )}
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {getSubtitle()}
          </Text>

          {/* Tags preview */}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {item.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
              {item.tags.length > 3 && (
                <Text style={styles.moreTagsText}>+{item.tags.length - 3}</Text>
              )}
            </View>
          )}
        </View>

        <ChevronRight color="#C7C7CC" size={18} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default VaultCard;

const styles = StyleSheet.create({
  animatedRowWrapper: {
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  containerActive: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  details: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flexShrink: 1,
  },
  pinIconWrapper: {
    padding: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  tagChip: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 10,
    color: '#C7C7CC',
    fontWeight: '600',
  },
});
