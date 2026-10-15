import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, Search, CheckSquare, Square, ListFilter } from 'lucide-react-native';
import { HapticService } from '../core/haptics';

export interface DropdownPickerModalProps {
  visible: boolean;
  title?: string;
  mode: 'select' | 'multiselect';
  options: string[];
  selectedValue?: string;
  initialValue?: string;
  accentColor?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function parseMultiSelectValues(val: string): string[] {
  if (!val) return [];
  // Try parsing JSON array first (if stored as JSON string)
  if (val.trim().startsWith('[') && val.trim().endsWith(']')) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
    } catch {
      // Fallback to comma-separated
    }
  }
  return val
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const DropdownPickerModal: React.FC<DropdownPickerModalProps> = ({
  visible,
  title,
  mode,
  options = [],
  selectedValue,
  initialValue,
  accentColor = '#007AFF',
  onSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const activeValue = selectedValue ?? initialValue ?? '';

  // Selected values set for multi-select
  const currentMultiSelected = useMemo(() => {
    return new Set(parseMultiSelectValues(activeValue));
  }, [activeValue]);

  // Local draft set for multi-select so user can toggle before confirming
  const [multiDraft, setMultiDraft] = useState<Set<string>>(new Set());

  // Reset or initialize draft when modal becomes visible
  React.useEffect(() => {
    if (visible && mode === 'multiselect') {
      setMultiDraft(new Set(parseMultiSelectValues(activeValue)));
      setSearchQuery('');
    } else if (visible) {
      setSearchQuery('');
    }
  }, [visible, activeValue, mode]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, searchQuery]);

  const handleSelectSingle = (option: string) => {
    HapticService.selection();
    onSelect(option);
    onClose();
  };

  const handleToggleMulti = (option: string) => {
    HapticService.selection();
    setMultiDraft((prev) => {
      const next = new Set(prev);
      if (next.has(option)) {
        next.delete(option);
      } else {
        next.add(option);
      }
      return next;
    });
  };

  const handleConfirmMulti = () => {
    HapticService.selection();
    const result = Array.from(multiDraft).join(', ');
    onSelect(result);
    onClose();
  };

  const handleClearAll = () => {
    HapticService.selection();
    if (mode === 'multiselect') {
      setMultiDraft(new Set());
    } else {
      onSelect('');
      onClose();
    }
  };

  const isMulti = mode === 'multiselect';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheet}>
              {/* Drag Indicator */}
              <View style={styles.indicatorContainer}>
                <View style={styles.indicator} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                      {title || (isMulti ? 'Select Options' : 'Select Option')}
                    </Text>
                    {isMulti && (
                      <View style={[styles.badge, { backgroundColor: `${accentColor}18` }]}>
                        <Text style={[styles.badgeText, { color: accentColor }]}>
                          {multiDraft.size} selected
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.headerSubtitle}>
                    {isMulti
                      ? 'Choose one or more options'
                      : 'Choose a single option from the list'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close picker"
                >
                  <X color="#8E8E93" size={18} />
                </TouchableOpacity>
              </View>

              {/* Search Filter (if > 5 options) */}
              {options.length > 5 && (
                <View style={styles.searchContainer}>
                  <Search size={15} color="#8E8E93" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search options..."
                    placeholderTextColor="#8E8E93"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    clearButtonMode="while-editing"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <X size={14} color="#8E8E93" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Options List */}
              <ScrollView
                style={{ maxHeight: 360 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {options.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyTitle}>No options configured</Text>
                    <Text style={styles.emptySubtitle}>
                      Configure allowed values for this field in Vault Customization.
                    </Text>
                  </View>
                ) : filteredOptions.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyTitle}>No matches found</Text>
                    <Text style={styles.emptySubtitle}>Try searching for a different keyword.</Text>
                  </View>
                ) : (
                  filteredOptions.map((opt, idx) => {
                    const isSelected = isMulti
                      ? multiDraft.has(opt)
                      : activeValue.trim() === opt.trim();

                    return (
                      <TouchableOpacity
                        key={`${opt}_${idx}`}
                        style={[
                          styles.optionRow,
                          isSelected && styles.optionRowSelected,
                          idx < filteredOptions.length - 1 && styles.optionBorder,
                        ]}
                        onPress={() => {
                          if (isMulti) {
                            handleToggleMulti(opt);
                          } else {
                            handleSelectSingle(opt);
                          }
                        }}
                        activeOpacity={0.65}
                        accessibilityRole="button"
                        accessibilityLabel={`Option ${opt}`}
                      >
                        {isMulti ? (
                          <View
                            style={[
                              styles.checkboxBox,
                              isSelected && {
                                backgroundColor: accentColor,
                                borderColor: accentColor,
                              },
                            ]}
                          >
                            {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.radioBox,
                              isSelected && {
                                borderColor: accentColor,
                              },
                            ]}
                          >
                            {isSelected && (
                              <View
                                style={[
                                  styles.radioInner,
                                  { backgroundColor: accentColor },
                                ]}
                              />
                            )}
                          </View>
                        )}

                        <Text
                          style={[
                            styles.optionText,
                            isSelected && { fontWeight: '700', color: '#000000' },
                          ]}
                          numberOfLines={2}
                        >
                          {opt}
                        </Text>

                        {isSelected && !isMulti && (
                          <Check size={18} color={accentColor} strokeWidth={2.5} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              {/* Actions Footer */}
              <View style={styles.footerRow}>
                {((isMulti && multiDraft.size > 0) || (!isMulti && selectedValue)) && (
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={handleClearAll}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clearBtnText}>Clear Selection</Text>
                  </TouchableOpacity>
                )}

                {isMulti && (
                  <TouchableOpacity
                    style={[styles.doneBtn, { backgroundColor: accentColor }]}
                    onPress={handleConfirmMulti}
                    activeOpacity={0.8}
                  >
                    <Check color="#FFFFFF" size={16} strokeWidth={2.4} style={{ marginRight: 6 }} />
                    <Text style={styles.doneBtnText}>
                      Apply ({multiDraft.size})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <SafeAreaView edges={['bottom']} />
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
  );
};

export default DropdownPickerModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
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
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '700',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000000',
    paddingVertical: 0,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 8,
  },
  optionRowSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.04)',
    borderRadius: 12,
  },
  optionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  clearBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FF3B30',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
