import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pin, PinOff, Trash2 } from 'lucide-react-native';
import { VaultItem } from '../types';
import { getItemBadgeTheme } from '../theme/categoryColors';
import { HapticService } from '../core/haptics';

interface ItemActionSheetProps {
  visible: boolean;
  item: VaultItem | null;
  onClose: () => void;
  onTogglePin: (item: VaultItem) => void;
  onDelete: (item: VaultItem) => void;
}

export const ItemActionSheet: React.FC<ItemActionSheetProps> = ({
  visible,
  item,
  onClose,
  onTogglePin,
  onDelete,
}) => {
  if (!item) return null;

  const isPinned = !!item.isPinned;
  const theme = getItemBadgeTheme(item);
  const IconComponent = theme.icon;

  const handleTogglePin = async () => {
    await HapticService.selection();
    onClose();
    onTogglePin(item);
  };

  const handleDeletePrompt = () => {
    onClose();
    // Allow sheet dismiss animation to settle before presenting native alert
    setTimeout(() => {
      Alert.alert(
        `Delete "${item.title}"?`,
        'This action cannot be undone. This item will be permanently removed from your encrypted vault.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await HapticService.warning();
              onDelete(item);
            },
          },
        ]
      );
    }, 150);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetContainer}>
              {/* Drag Indicator */}
              <View style={styles.indicatorContainer}>
                <View style={styles.dragIndicator} />
              </View>

              {/* Item Preview Header */}
              <View style={styles.headerRow}>
                <View style={[styles.avatarSquircle, { backgroundColor: theme.bgTint }]}>
                  <IconComponent color={theme.color} size={22} strokeWidth={2.4} />
                </View>
                <View style={styles.headerTextGroup}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.categoryMetaRow}>
                    <Text style={styles.categoryMetaText}>
                      {item.category === 'card'
                        ? 'Payment Card'
                        : item.category === 'login'
                        ? 'Login Credential'
                        : 'Note'}
                    </Text>
                    {isPinned && (
                      <View style={styles.pinnedBadgePill}>
                        <Pin size={10} color="#D97706" />
                        <Text style={styles.pinnedBadgeText}>PINNED</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Options Menu */}
              <View style={styles.optionsCard}>
                {/* 1. Pin / Unpin Option */}
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={handleTogglePin}
                  activeOpacity={0.65}
                  accessibilityRole="button"
                  accessibilityLabel={isPinned ? 'Unpin item from top' : 'Pin item to top'}
                >
                  <View
                    style={[
                      styles.optionIconSquircle,
                      isPinned ? styles.pinnedIconBg : styles.unpinnedIconBg,
                    ]}
                  >
                    {isPinned ? (
                      <PinOff size={19} color="#D97706" strokeWidth={2.2} />
                    ) : (
                      <Pin size={19} color="#1F2937" strokeWidth={2.2} />
                    )}
                  </View>
                  <View style={styles.optionTextGroup}>
                    <Text style={styles.optionTitleText}>
                      {isPinned ? 'Unpin from Top' : 'Pin to Top'}
                    </Text>
                    <Text style={styles.optionSubtitleText}>
                      {isPinned
                        ? 'Remove from pinned items at the top'
                        : 'Keep this item at the top of your vault'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.optionDivider} />

                {/* 2. Delete Option */}
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={handleDeletePrompt}
                  activeOpacity={0.65}
                  accessibilityRole="button"
                  accessibilityLabel="Delete item"
                >
                  <View style={[styles.optionIconSquircle, styles.deleteIconBg]}>
                    <Trash2 size={19} color="#FF3B30" strokeWidth={2.2} />
                  </View>
                  <View style={styles.optionTextGroup}>
                    <Text style={[styles.optionTitleText, styles.deleteText]}>
                      Delete Item
                    </Text>
                    <Text style={styles.optionSubtitleText}>
                      Permanently remove from encrypted vault
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <SafeAreaView edges={['bottom']} />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default ItemActionSheet;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  indicatorContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D1D6',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatarSquircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextGroup: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  categoryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryMetaText: {
    fontSize: 12.5,
    color: '#6B7280',
    fontWeight: '500',
  },
  pinnedBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  pinnedBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginVertical: 6,
  },
  optionsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
    marginBottom: 14,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  optionIconSquircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pinnedIconBg: {
    backgroundColor: '#FEF3C7',
  },
  unpinnedIconBg: {
    backgroundColor: '#E5E7EB',
  },
  deleteIconBg: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  optionTextGroup: {
    flex: 1,
  },
  optionTitleText: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  optionSubtitleText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '400',
  },
  deleteText: {
    color: '#FF3B30',
  },
  optionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginLeft: 64,
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
});
