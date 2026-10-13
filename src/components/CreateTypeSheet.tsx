import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  KeyRound,
  CreditCard,
  StickyNote,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { ItemCategory } from '../types';
import { CATEGORY_THEMES } from '../theme/categoryColors';

interface CreateTypeSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectType: (category: ItemCategory) => void;
}

interface TypeOption {
  category: ItemCategory;
  title: string;
  description: string;
  icon: any;
  color: string;
  bgTint: string;
}

export const CreateTypeSheet: React.FC<CreateTypeSheetProps> = ({
  visible,
  onClose,
  onSelectType,
}) => {
  const options: TypeOption[] = [
    {
      category: 'login',
      title: 'Login & Password',
      description: 'Account credentials, multiple websites, notes & tags',
      icon: KeyRound,
      color: CATEGORY_THEMES.login.color,
      bgTint: CATEGORY_THEMES.login.bgTint,
    },
    {
      category: 'card',
      title: 'Credit / Debit Card',
      description: 'Card number, CVV, expiry, PIN, brand & details',
      icon: CreditCard,
      color: CATEGORY_THEMES.card.color,
      bgTint: CATEGORY_THEMES.card.bgTint,
    },
    {
      category: 'note',
      title: 'Notes',
      description: 'Clean title & open canvas freeform text for anything',
      icon: StickyNote,
      color: CATEGORY_THEMES.note.color,
      bgTint: CATEGORY_THEMES.note.bgTint,
    },
  ];

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
                  <Text style={styles.headerSubtitle}>Select item category to protect</Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X color="#8E8E93" size={20} />
                </TouchableOpacity>
              </View>

              {/* 5 Options List */}
              <View style={styles.optionsList}>
                {options.map((opt, index) => {
                  const Icon = opt.icon;
                  const isLast = index === options.length - 1;

                  return (
                    <TouchableOpacity
                      key={opt.category}
                      style={[styles.optionRow, !isLast && styles.rowBorder]}
                      onPress={() => onSelectType(opt.category)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.iconBox, { backgroundColor: opt.bgTint }]}>
                        <Icon color={opt.color} size={22} />
                      </View>
                      <View style={styles.textContainer}>
                        <Text style={styles.optionTitle}>{opt.title}</Text>
                        <Text style={styles.optionDescription} numberOfLines={1}>
                          {opt.description}
                        </Text>
                      </View>
                      <ChevronRight color="#C7C7CC" size={18} />
                    </TouchableOpacity>
                  );
                })}
              </View>

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
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 24,
  },
  indicatorContainer: {
    alignItems: 'center',
    paddingVertical: 8,
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
    marginTop: 6,
    marginBottom: 16,
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
  optionsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 3,
  },
  optionDescription: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
