import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TouchableWithoutFeedback,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  KeyRound,
  CreditCard,
  StickyNote,
  X,
  Folder,
  SlidersHorizontal,
} from 'lucide-react-native';
import { ItemCategory } from '../types';
import { CATEGORY_THEMES, CATEGORY_ICON_MAP } from '../theme/categoryColors';
import { useVault } from '../context/VaultContext';
import { HapticService } from '../core/haptics';

interface CreateTypeSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectType: (category: ItemCategory) => void;
}

interface TypeOption {
  category: ItemCategory;
  title: string;
  icon: any;
  color: string;
  bgTint: string;
}

export const CreateTypeSheet: React.FC<CreateTypeSheetProps> = ({
  visible,
  onClose,
  onSelectType,
}) => {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { customCategories } = useVault();

  // 4 square columns on phones, 6 on tablets
  const numColumns = windowWidth >= 600 ? 6 : 4;
  const sheetHorizontalPadding = 16;
  const gridGap = 8;
  const totalGap = (numColumns - 1) * gridGap;
  const availableWidth = windowWidth - sheetHorizontalPadding * 2 - totalGap;
  const cardWidth = Math.floor(availableWidth / numColumns);

  const options: TypeOption[] = [
    {
      category: 'login',
      title: 'Login',
      icon: KeyRound,
      color: CATEGORY_THEMES.login.color,
      bgTint: CATEGORY_THEMES.login.bgTint,
    },
    {
      category: 'card',
      title: 'Card',
      icon: CreditCard,
      color: CATEGORY_THEMES.card.color,
      bgTint: CATEGORY_THEMES.card.bgTint,
    },
    {
      category: 'note',
      title: 'Note',
      icon: StickyNote,
      color: CATEGORY_THEMES.note.color,
      bgTint: CATEGORY_THEMES.note.bgTint,
    },
    ...customCategories.map((c) => ({
      category: c.id,
      title: c.name,
      icon: CATEGORY_ICON_MAP[c.icon] || Folder,
      color: c.color,
      bgTint: c.bgTint || `${c.color}1A`,
    })),
  ];

  const handleManageCategories = () => {
    onClose();
    router.push('/categories');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheet}>
              {/* Drag Indicator */}
              <View style={styles.indicatorContainer}>
                <View style={styles.indicator} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.headerTitle}>New Vault Item</Text>
                  <Text style={styles.headerSubtitle}>Select category to create</Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close sheet"
                >
                  <X color="#8E8E93" size={20} />
                </TouchableOpacity>
              </View>

              {/* Square Category Grid (4 on phones, 6 on tablets) */}
              <ScrollView
                style={{ maxHeight: 420 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.gridContainer}>
                  {options.map((opt) => {
                    const Icon = opt.icon;

                    return (
                      <TouchableOpacity
                        key={opt.category}
                        style={[styles.squareCard, { width: cardWidth }]}
                        onPress={() => {
                          HapticService.selection();
                          onSelectType(opt.category);
                        }}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Create ${opt.title}`}
                      >
                        <View style={[styles.cardIconBox, { backgroundColor: opt.bgTint }]}>
                          <Icon color={opt.color} size={20} strokeWidth={2.2} />
                        </View>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {opt.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Manage Categories Shortcut Row */}
              <TouchableOpacity
                style={styles.manageRow}
                onPress={handleManageCategories}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Customize categories in playground"
              >
                <SlidersHorizontal color="#007AFF" size={15} style={{ marginRight: 8 }} />
                <Text style={styles.manageText}>Customize Categories in Playground</Text>
              </TouchableOpacity>

              <SafeAreaView edges={['bottom']} />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default CreateTypeSheet;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 8 : 20,
  },
  indicatorContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  indicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
  },
  scrollContent: {
    paddingBottom: 6,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  squareCard: {
    aspectRatio: 1,
    minHeight: 82,
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  manageText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
});
