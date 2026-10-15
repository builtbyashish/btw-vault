import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import {
  KeyRound,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Radio,
  Pin,
  MoreVertical,
  CheckSquare,
  Square,
} from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { VaultItem } from '../types';
import { ClipboardService } from '../core/security/clipboardService';
import { HapticService } from '../core/haptics';
import { CardNetworkLogo } from '../card-validator/logos';
import { CardNetwork } from '../card-validator/types';
import { resolveCardTheme } from '../card-validator/theme';
import { useVault } from '../context/VaultContext';
import { getCategoryDetails } from '../theme/categoryColors';

// Curated Fallback Gradients (retained for backward compatibility)
export const CARD_GRADIENTS = [
  { id: 'purple', start: '#6D28D9', end: '#4338CA', shadow: '#6D28D9' },
  { id: 'blue', start: '#00B4DB', end: '#0284C7', shadow: '#0083B0' },
  { id: 'coral', start: '#FF2A6D', end: '#EA580C', shadow: '#F43F5E' },
  { id: 'emerald', start: '#10B981', end: '#047857', shadow: '#059669' },
  { id: 'slate', start: '#334155', end: '#0F172A', shadow: '#1E293B' },
];

export function getCardGradientTheme(
  itemOrDetails?: VaultItem | any,
  index: number = 0
) {
  let brand = '';
  let cardNumber = '';

  if (typeof itemOrDetails === 'string') {
    brand = itemOrDetails;
  } else if (itemOrDetails) {
    if ('cardDetails' in itemOrDetails && itemOrDetails.cardDetails) {
      brand = itemOrDetails.cardDetails.cardBrand || '';
      cardNumber = itemOrDetails.cardDetails.cardNumber || '';
    } else if ('cardNumber' in itemOrDetails || 'cardBrand' in itemOrDetails) {
      brand = itemOrDetails.cardBrand || '';
      cardNumber = itemOrDetails.cardNumber || '';
    }
  }

  const theme = resolveCardTheme(brand, cardNumber);
  return {
    id: theme.id,
    start: theme.start,
    end: theme.end,
    shadow: theme.shadow,
  };
}

interface DynamicVaultCardProps {
  item: VaultItem;
  index?: number;
  fullWidth?: boolean;
  isActive?: boolean;
  isMenuTarget?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onRequireAuth?: (reason: string) => Promise<boolean>;
}

export const DynamicVaultCard: React.FC<DynamicVaultCardProps> = ({
  item,
  index = 0,
  fullWidth = false,
  isActive = false,
  isMenuTarget = false,
  onPress,
  onLongPress,
  onRequireAuth,
}) => {
  const { customCategories } = useVault();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isMenuTarget) {
      Animated.spring(scaleAnim, {
        toValue: 1.038,
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

  const handleCardLongPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.045,
        duration: 120,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1.038,
        friction: 6.5,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
    if (onLongPress) onLongPress();
  };

  const handleCopy = async (text: string, key: string) => {
    if (!text) return;
    await ClipboardService.copyWithAutoClear(text, 30);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 1800);
  };

  const renderCardBrandLogo = (brandName?: string, isFull?: boolean) => {
    const net = (brandName || 'unknown').toLowerCase() as CardNetwork;
    return (
      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
        <CardNetworkLogo network={net} size={isFull ? 24 : 18} monochrome={false} />
      </View>
    );
  };

  const renderCardContent = () => {
    // 1. CARDS: Vibrant modern gradient card matching user reference image
    if (item.category === 'card') {
      const card = item.cardDetails || {};
      const cardTheme = resolveCardTheme(card.cardBrand, card.cardNumber);
      const gradTheme = cardTheme;
      const rawNumber = card.cardNumber?.replace(/\s+/g, '') || '';
      const last4 = rawNumber.slice(-4) || '••••';
      const first4 = rawNumber.length >= 8 ? rawNumber.slice(0, 4) : '4209';
      const cardholder = card.cardholderName || 'CARDHOLDER';
      const maskedFormatted = fullWidth
        ? (rawNumber.length >= 8
            ? `${first4} •••• •••• ${last4}`
            : `•••• •••• •••• ${last4}`)
        : `•••• •••• ${last4}`;

      return (
        <View
          style={[
            styles.creditCardContainer,
            {
              backgroundColor: gradTheme.start,
              shadowColor: gradTheme.shadow,
            },
            fullWidth && styles.creditCardContainerFull,
            isActive && styles.creditCardContainerActive,
          ]}
        >
          <TouchableOpacity
            style={[
              styles.creditCardFace,
              fullWidth && styles.creditCardFaceFull,
              { backgroundColor: gradTheme.start },
            ]}
            onPress={onPress}
            onLongPress={handleCardLongPress}
            delayLongPress={300}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={`Payment Card ${item.title}`}
          >
            {/* SVG Linear Gradient Layer */}
            <Svg style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id={`card_grad_${item.id}`} x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={gradTheme.start} stopOpacity="1" />
                  <Stop offset="1" stopColor={gradTheme.end} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect
                width="100%"
                height="100%"
                rx={fullWidth ? 24 : 16}
                fill={`url(#card_grad_${item.id})`}
              />
            </Svg>

            {/* Top Row: Title (Amount/Name) & Card Brand Logo */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleCluster}>
                {fullWidth && (
                  <View style={styles.cardChipClusterInline}>
                    <View style={styles.emvChipDeck}>
                      <View style={styles.emvCircuitLineH} />
                      <View style={styles.emvCircuitLineV} />
                      <View style={styles.emvCenterCore} />
                    </View>
                    <Radio size={14} color="rgba(255, 255, 255, 0.75)" style={{ transform: [{ rotate: '90deg' }] }} />
                  </View>
                )}
                <Text
                  style={[
                    styles.cardTitleText,
                    fullWidth && styles.cardTitleTextFull,
                  ]}
                  numberOfLines={1}
                >
                  {item.title || 'Card'}
                </Text>
                {item.isPinned && (
                  <View style={styles.cardPinBadgeOnCard}>
                    <Pin size={fullWidth ? 12 : 10} color="#FFD700" fill="#FFD700" />
                  </View>
                )}
              </View>

              {renderCardBrandLogo(cardTheme.effectiveNetwork, fullWidth)}
            </View>

            {/* Bottom Area: Left (Number + Cardholder), Right (3-dots squircle button) */}
            <View style={styles.cardBottomRow}>
              <View style={styles.cardBottomLeftCol}>
                <Text
                  style={[
                    styles.cardNumberMasked,
                    fullWidth && styles.cardNumberMaskedFull,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.72}
                >
                  {maskedFormatted}
                </Text>
                <Text
                  style={[
                    styles.cardholderName,
                    fullWidth && styles.cardholderNameFull,
                  ]}
                  numberOfLines={1}
                >
                  {cardholder.toUpperCase()}
                </Text>
              </View>

              {/* 3-dots MoreVertical squircle button from reference image */}
              <TouchableOpacity
                style={[
                  styles.cardMoreBtnSquircle,
                  fullWidth && styles.cardMoreBtnSquircleFull,
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  HapticService.selection();
                  handleCardLongPress();
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
                accessibilityLabel="Card options"
              >
                <MoreVertical size={fullWidth ? 19 : 14} color="#FFFFFF" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

  // 2. NOTES: Google Keep style dynamic height with signature Keep colors & checklist preview
  if (item.category === 'note' || item.category === 'other') {
    const accentColor = '#7C4DFF';
    const categoryName = 'Note';
    const noteText = item.notes?.trim() || '';
    const hasSections = item.noteSections && item.noteSections.length > 0;

    const isCustomColor = item.color && item.color.toLowerCase() !== '#ffffff';

    const rawLines = noteText ? noteText.split('\n').filter((l) => l.trim().length > 0) : [];
    const isChecklist = rawLines.some((l) => l.startsWith('[ ] ') || l.startsWith('[x] '));
    const checklistPreview = isChecklist
      ? rawLines.slice(0, 5).map((l) => ({
          completed: l.startsWith('[x] '),
          text: l.replace(/^\[[ x]\]\s*/, ''),
        }))
      : [];
    const checklistMoreCount = isChecklist ? Math.max(0, rawLines.length - 5) : 0;

    return (
      <TouchableOpacity
        style={[
          styles.noteCardContainer,
          isCustomColor
            ? { backgroundColor: item.color, borderColor: 'rgba(0, 0, 0, 0.08)', borderWidth: 1 }
            : { borderLeftColor: accentColor },
        ]}
        onPress={onPress}
        onLongPress={handleCardLongPress}
        delayLongPress={300}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${categoryName} ${item.title}`}
      >
        {/* Header with Category Indicator */}
        <View style={styles.noteHeader}>
          <View style={styles.noteCategoryBadge}>
            <View style={[styles.categoryDot, { backgroundColor: accentColor }]} />
            <Text style={[styles.noteCategoryText, { color: accentColor }]}>
              {categoryName}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {item.isPinned && (
              <Pin size={11} color="#7C4DFF" fill="#7C4DFF" />
            )}
            <ChevronRight size={13} color="#C7C7CC" />
          </View>
        </View>

        {/* Note Title */}
        <Text style={styles.noteTitleText} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Dynamic Body: Expands naturally with text size, checklist aware */}
        {noteText ? (
          isChecklist ? (
            <View style={styles.noteChecklistPreviewGroup}>
              {checklistPreview.map((cItem, cIdx) => (
                <View key={cIdx} style={styles.noteChecklistRow}>
                  {cItem.completed ? (
                    <CheckSquare size={13} color="#9CA3AF" strokeWidth={2.2} />
                  ) : (
                    <Square size={13} color="#6B7280" strokeWidth={2.2} />
                  )}
                  <Text
                    style={[
                      styles.noteChecklistText,
                      cItem.completed && styles.noteChecklistTextDone,
                    ]}
                    numberOfLines={1}
                  >
                    {cItem.text}
                  </Text>
                </View>
              ))}
              {checklistMoreCount > 0 && (
                <Text style={styles.noteChecklistMoreCount}>
                  +{checklistMoreCount} more {checklistMoreCount === 1 ? 'item' : 'items'}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.noteBodyText} numberOfLines={8}>
              {noteText}
            </Text>
          )
        ) : null}

        {/* Note Sections summary */}
        {hasSections && (
          <View style={styles.noteSectionsGroup}>
            {item.noteSections!.slice(0, 2).map((sec, idx) => (
              <View key={sec.id || idx} style={styles.sectionPreviewChip}>
                <Text style={styles.sectionPreviewTitle} numberOfLines={1}>
                  {sec.title || `Part ${idx + 1}`}
                </Text>
                <Text style={styles.sectionPreviewSnippet} numberOfLines={1}>
                  {sec.content.replace(/\n+/g, ' ')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // 3. LOGIN: FAB Gold Yellow (#FFB703) with 1-tap copy credentials
  if (item.category === 'login') {
    const domain = item.url
      ? item.url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0]
      : null;

    return (
      <TouchableOpacity
        style={styles.loginCardContainer}
        onPress={onPress}
        onLongPress={handleCardLongPress}
        delayLongPress={300}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`Login ${item.title}`}
      >
        <View style={styles.loginHeaderRow}>
          <View style={styles.loginAvatarSquircle}>
            <KeyRound size={17} color="#FFB703" strokeWidth={2.4} />
          </View>
          <View style={styles.loginTitleGroup}>
            <Text style={styles.loginTitleText} numberOfLines={1}>
              {item.title}
            </Text>
            {domain ? (
              <View style={styles.domainRow}>
                <Text style={styles.domainText} numberOfLines={1}>
                  {domain}
                </Text>
                <ExternalLink size={9} color="#8E8E93" style={{ marginLeft: 3 }} />
              </View>
            ) : item.username ? (
              <Text style={styles.domainText} numberOfLines={1}>
                {item.username}
              </Text>
            ) : null}
          </View>
          {item.isPinned && (
            <View style={styles.cardPinBadge}>
              <Pin size={11} color="#D97706" fill="#D97706" />
            </View>
          )}
        </View>

        {/* Compact Credentials Box */}
        {(item.username || item.password) && (
          <View style={styles.credentialBox}>
            {item.username ? (
              <View style={styles.credentialRow}>
                <View style={styles.credentialTextCol}>
                  <Text style={styles.credentialLabel}>USER</Text>
                  <Text style={styles.credentialValue} numberOfLines={1}>
                    {item.username}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.copyBtn, copiedKey === 'user' && styles.copyBtnSuccess]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleCopy(item.username!, 'user');
                  }}
                  activeOpacity={0.6}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {copiedKey === 'user' ? (
                    <Check size={11} color="#34C759" strokeWidth={2.6} />
                  ) : (
                    <Copy size={11} color="#8E8E93" strokeWidth={2.2} />
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            {item.username && item.password ? <View style={styles.credentialDivider} /> : null}

            {item.password ? (
              <View style={styles.credentialRow}>
                <View style={styles.credentialTextCol}>
                  <Text style={styles.credentialLabel}>PASS</Text>
                  <Text style={styles.credentialPasswordDots}>•••••••</Text>
                </View>
                <TouchableOpacity
                  style={[styles.copyBtn, copiedKey === 'pass' && styles.copyBtnSuccess]}
                  onPress={async (e) => {
                    e.stopPropagation();
                    if (!item.password) return;
                    if (onRequireAuth) {
                      const ok = await onRequireAuth(`Authenticate to copy password for ${item.title}`);
                      if (!ok) return;
                    }
                    await handleCopy(item.password, 'pass');
                  }}
                  activeOpacity={0.6}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {copiedKey === 'pass' ? (
                    <Check size={11} color="#34C759" strokeWidth={2.6} />
                  ) : (
                    <Copy size={11} color="#8E8E93" strokeWidth={2.2} />
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        {/* Footer: Tags or Security status */}
        <View style={styles.loginFooterRow}>
          {item.tags && item.tags.length > 0 ? (
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 2).map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.securityIndicator}>
              <ShieldCheck size={11} color="#FFB703" />
              <Text style={styles.securityText}>Protected</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

    // 4. Custom Categories: Render with category theme squircle, badge, and custom fields preview
    const categoryDetails = getCategoryDetails(item.category, customCategories);
    if (categoryDetails.isCustom) {
      const IconComponent = categoryDetails.icon;
      return (
        <TouchableOpacity
          style={styles.loginCardContainer}
          onPress={onPress}
          onLongPress={handleCardLongPress}
          delayLongPress={300}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={`${categoryDetails.name} ${item.title}`}
        >
          <View style={styles.loginHeaderRow}>
            <View
              style={[
                styles.loginAvatarSquircle,
                { backgroundColor: categoryDetails.bgTint },
              ]}
            >
              <IconComponent size={17} color={categoryDetails.color} strokeWidth={2.4} />
            </View>
            <View style={styles.loginTitleGroup}>
              <Text style={styles.loginTitleText} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.domainText, { color: categoryDetails.color, fontWeight: '600' }]} numberOfLines={1}>
                {categoryDetails.name}
              </Text>
            </View>
            {item.isPinned && (
              <View style={styles.cardPinBadge}>
                <Pin size={11} color="#D97706" fill="#D97706" />
              </View>
            )}
          </View>

          {/* Custom Fields Preview */}
          {item.customFields && item.customFields.length > 0 ? (
            <View style={styles.credentialBox}>
              {item.customFields.slice(0, 2).map((cf) => {
                const isHidden = cf.type === 'hidden' || cf.type === 'key';
                return (
                  <View key={cf.id} style={styles.credentialRow}>
                    <View style={styles.credentialTextCol}>
                      <Text style={styles.credentialLabel}>{(cf.label || cf.type).toUpperCase()}</Text>
                      <Text style={styles.credentialValue} numberOfLines={1}>
                        {isHidden ? '••••••••' : cf.value || '—'}
                      </Text>
                    </View>
                    {cf.value ? (
                      <TouchableOpacity
                        style={[styles.copyBtn, copiedKey === cf.id && styles.copyBtnSuccess]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCopy(cf.value, cf.id);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        {copiedKey === cf.id ? (
                          <Check size={12} color="#10B981" strokeWidth={2.6} />
                        ) : (
                          <Copy size={12} color="#8E8E93" />
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : item.notes ? (
            <Text style={[styles.noteBodyText, { paddingHorizontal: 12, paddingBottom: 6 }]} numberOfLines={2}>
              {item.notes}
            </Text>
          ) : null}

          {/* Footer: Tags or Protected Indicator */}
          <View style={styles.loginFooterRow}>
            {item.tags && item.tags.length > 0 ? (
              <View style={styles.tagsContainer}>
                {item.tags.slice(0, 2).map((tag) => (
                  <View key={tag} style={styles.tagPill}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.securityIndicator}>
                <ShieldCheck size={11} color={categoryDetails.color} />
                <Text style={styles.securityText}>Protected</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    // 5. Fallback for any other category item (renders as Note)
    return (
      <TouchableOpacity
        style={[styles.noteCardContainer, { borderLeftColor: '#7C4DFF' }]}
        onPress={onPress}
        onLongPress={handleCardLongPress}
        delayLongPress={300}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Item ${item.title}`}
      >
        <View style={styles.noteHeader}>
          <Text style={styles.noteTitleText} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        {item.notes ? (
          <Text style={styles.noteBodyText} numberOfLines={3}>
            {item.notes}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View
      style={[
        styles.animatedCardWrapper,
        {
          transform: [{ scale: scaleAnim }],
          zIndex: isMenuTarget ? 25 : 1,
          elevation: isMenuTarget ? 10 : 1,
        },
      ]}
    >
      {renderCardContent()}
    </Animated.View>
  );
};

export default DynamicVaultCard;

const styles = StyleSheet.create({
  animatedCardWrapper: {
    width: '100%',
  },
  // --- 1. Credit Card Styles (Vibrant Modern Gradients from Reference Image) ---
  creditCardContainer: {
    width: '100%',
    marginBottom: 10,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  creditCardContainerFull: {
    marginBottom: 16,
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  creditCardContainerActive: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.36,
    shadowRadius: 18,
    elevation: 12,
  },
  creditCardFace: {
    aspectRatio: 1.586,
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  creditCardFaceFull: {
    borderRadius: 24,
    padding: 20,
    aspectRatio: 1.6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  cardChipClusterInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 4,
  },
  emvChipDeck: {
    width: 28,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#E5C058',
    borderWidth: 1,
    borderColor: '#C49B28',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emvCircuitLineH: {
    position: 'absolute',
    top: 9,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#9E7812',
  },
  emvCircuitLineV: {
    position: 'absolute',
    left: 13,
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#9E7812',
  },
  emvCenterCore: {
    width: 10,
    height: 7,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#9E7812',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  cardTitleTextFull: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardPinBadgeOnCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 3,
    borderRadius: 5,
  },
  // Logos
  mastercardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mcCircle: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  visaLogoText: {
    fontSize: 15,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  visaLogoTextFull: {
    fontSize: 22,
    letterSpacing: 2,
  },
  amexLogoBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  amexLogoBadgeFull: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  amexLogoText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  genericBrandBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  genericBrandText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  genericBrandTextFull: {
    fontSize: 11,
    letterSpacing: 1,
  },
  // Bottom Row
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
  },
  cardBottomLeftCol: {
    flex: 1,
    flexShrink: 1,
    marginRight: 6,
  },
  cardNumberMasked: {
    fontSize: Platform.OS === 'ios' ? 11 : 10.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: Platform.OS === 'ios' ? 0.6 : 0.3,
    marginBottom: 2,
  },
  cardNumberMaskedFull: {
    fontSize: Platform.OS === 'ios' ? 15.5 : 14.5,
    letterSpacing: Platform.OS === 'ios' ? 1.2 : 0.8,
    marginBottom: 4,
  },
  cardholderName: {
    fontSize: 8.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.92)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardholderNameFull: {
    fontSize: 12,
    letterSpacing: 0.8,
  },
  // 3-dots Squircle Button
  cardMoreBtnSquircle: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    flexShrink: 0,
  },
  cardMoreBtnSquircleFull: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    flexShrink: 0,
  },

  // --- 2. Dynamic Note Card Styles (FAB Colors: #2A9D8F Emerald & #7C4DFF Purple) ---
  noteCardContainer: {
    width: '100%',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 3.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  noteCategoryText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  noteTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  noteBodyText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#374151',
    marginBottom: 6,
  },
  noteChecklistPreviewGroup: {
    marginBottom: 6,
    gap: 4,
  },
  noteChecklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteChecklistText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#374151',
    flex: 1,
  },
  noteChecklistTextDone: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  noteChecklistMoreCount: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
    fontStyle: 'italic',
  },
  noteSectionsGroup: {
    marginTop: 2,
    marginBottom: 6,
    gap: 4,
  },
  sectionPreviewChip: {
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  sectionPreviewTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 1,
  },
  sectionPreviewSnippet: {
    fontSize: 11,
    color: '#6B7280',
  },

  // --- 3. Login Card Styles (FAB Gold Yellow #FFB703) ---
  loginCardContainer: {
    width: '100%',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 3.5,
    borderLeftColor: '#FFB703', // 🟡 FAB Gold Yellow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  loginHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  loginAvatarSquircle: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#FFF8E6', // Soft gold-yellow tint
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 9,
  },
  loginTitleGroup: {
    flex: 1,
  },
  loginTitleText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  domainText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '400',
  },
  credentialBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    gap: 5,
  },
  credentialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  credentialDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  credentialTextCol: {
    flex: 1,
    marginRight: 6,
  },
  credentialLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  credentialValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  credentialPasswordDots: {
    fontSize: 12,
    color: '#1C1C1E',
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  copyBtn: {
    backgroundColor: '#FFFFFF',
    padding: 4,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  copyBtnSuccess: {
    borderColor: '#34C759',
    backgroundColor: '#F0FDF4',
  },
  loginFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  securityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  securityText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '600',
  },

  // --- Shared Tags ---
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tagPill: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  tagText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#6B7280',
  },
  cardPinBadge: {
    padding: 3,
    borderRadius: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    marginLeft: 6,
  },
});
