import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { AppHeader } from '../src/components/AppHeader';
import {
  Plus,
  Trash2,
  X,
  Check,
  Star,
  Layers,
  ChevronRight,
  Folder,
  AlignLeft,
  Key,
  CreditCard as CreditCardIcon,
  Hash,
  Globe,
  Calendar,
  Mail,
  Type,
  Edit2,
  Info,
  Sparkles,
  CheckSquare,
  ListFilter,
  Search,
  Smile,
} from 'lucide-react-native';
import { useVault } from '../src/context/VaultContext';
import {
  CustomCategoryDefinition,
  FieldSchemaTemplate,
  CustomFieldType,
} from '../src/types';
import {
  CURATED_CATEGORY_COLORS,
  CURATED_CATEGORY_ICONS,
  CURATED_EMOJI_ICONS,
  ALL_SEARCHABLE_ICONS,
  CATEGORY_ICON_GROUPS,
  CuratedIconItem,
  IconGroupKey,
  CATEGORY_ICON_MAP,
  CATEGORY_THEMES,
  isEmojiIcon,
  cleanEmoji,
  getCategoryIcon,
} from '../src/theme/categoryColors';
import { HapticService } from '../src/core/haptics';
import { useKeyboardAwareScroll } from '../src/core/useKeyboardAwareScroll';

const QUICK_PICK_ICONS: { id: string; label: string }[] = [
  { id: 'KeyRound', label: 'Key' },
  { id: 'ShieldCheck', label: 'Shield' },
  { id: 'CreditCard', label: 'Card' },
  { id: 'Wallet', label: 'Wallet' },
  { id: 'Landmark', label: 'Bank' },
  { id: 'Smartphone', label: 'Phone' },
  { id: 'House', label: 'Home' },
  { id: 'Car', label: 'Car' },
  { id: 'Plane', label: 'Flight' },
  { id: 'Heart', label: 'Health' },
  { id: 'Briefcase', label: 'Work' },
  { id: 'Gamepad2', label: 'Gaming' },
  { id: 'Tv', label: 'TV' },
  { id: 'StickyNote', label: 'Note' },
  { id: 'Folder', label: 'Folder' },
  { id: 'emoji:🔑', label: 'Key' },
  { id: 'emoji:💳', label: 'Card' },
  { id: 'emoji:🏦', label: 'Bank' },
  { id: 'emoji:🚀', label: 'Rocket' },
  { id: 'emoji:🏠', label: 'Home' },
  { id: 'emoji:🎮', label: 'Gaming' },
  { id: 'emoji:🏥', label: 'Medical' },
  { id: 'emoji:🍕', label: 'Food' },
  { id: 'emoji:💎', label: 'Diamond' },
];

const FIELD_TYPE_OPTIONS: { type: CustomFieldType; label: string; desc: string; icon: any }[] = [
  { type: 'text', label: 'Single-line Text', desc: 'Standard short text or label', icon: Type },
  { type: 'textarea', label: 'Multiline Text Area', desc: 'Backup codes, certificates & notes', icon: AlignLeft },
  { type: 'select', label: 'Dropdown (Single)', desc: 'Single choice from configured options', icon: CheckSquare },
  { type: 'multiselect', label: 'Multi-Select', desc: 'Multiple choices from configured options', icon: ListFilter },
  { type: 'key', label: 'Secret Key / Token', desc: 'Monospace, eye reveal toggle & auto-clear', icon: Key },
  { type: 'payment', label: 'Payment / Account', desc: 'Account number, IBAN or amount', icon: CreditCardIcon },
  { type: 'number', label: 'Number', desc: 'Numeric keypad input', icon: Hash },
  { type: 'url', label: 'Web URL / Link', desc: 'Website address with direct launch', icon: Globe },
  { type: 'email', label: 'Email Address', desc: 'Email formatted input', icon: Mail },
  { type: 'date', label: 'Date', desc: 'Calendar date picker', icon: Calendar },
];

export default function CustomCategoriesScreen() {
  const router = useRouter();
  const {
    items,
    customCategories,
    pinnedCategoryIds,
    addCustomCategory,
    updateCustomCategory,
    deleteCustomCategory,
    setPinnedCategoryIds,
  } = useVault();

  // Builder Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomCategoryDefinition | null>(null);

  // Form State
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState(CURATED_CATEGORY_COLORS[0].hex);
  const [catIcon, setCatIcon] = useState(CURATED_CATEGORY_ICONS[0].id);
  const [fields, setFields] = useState<FieldSchemaTemplate[]>([]);
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});

  // Field type selector sub-modal
  const [activeFieldIdForType, setActiveFieldIdForType] = useState<string | null>(null);

  // Icon & Emoji Picker Modal State
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [selectedIconGroup, setSelectedIconGroup] = useState<IconGroupKey>('all');
  const [customEmojiText, setCustomEmojiText] = useState('');

  // Human readable label for any icon or emoji
  const getIconLabel = (iconId: string) => {
    if (isEmojiIcon(iconId)) {
      const clean = cleanEmoji(iconId);
      const found = CURATED_EMOJI_ICONS.find((e) => e.emojiChar === clean || e.id === iconId);
      return found ? `${clean}  ${found.label}` : `Emoji: ${clean}`;
    }
    const found = ALL_SEARCHABLE_ICONS.find((i) => i.id === iconId);
    return found ? found.label : iconId;
  };

  // Filtered icons and emojis based on search and group
  const filteredIcons = useMemo(() => {
    let list = ALL_SEARCHABLE_ICONS;

    if (selectedIconGroup !== 'all') {
      if (selectedIconGroup === 'emoji') {
        list = list.filter((i) => i.isEmoji);
      } else {
        list = list.filter((i) => i.group === selectedIconGroup);
      }
    }

    const q = iconSearchQuery.trim().toLowerCase();
    if (!q) return list;

    if (isEmojiIcon(q)) {
      return list;
    }

    return list.filter((item) => {
      if (item.label.toLowerCase().includes(q)) return true;
      if (item.id.toLowerCase().includes(q)) return true;
      if (item.tags.some((t) => t.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [selectedIconGroup, iconSearchQuery]);

  // Detected emoji in search bar
  const typedEmojiInSearch = useMemo(() => {
    const trimmed = iconSearchQuery.trim();
    if (isEmojiIcon(trimmed)) {
      return cleanEmoji(trimmed);
    }
    return null;
  }, [iconSearchQuery]);

  const handleSelectPickerIcon = (item: CuratedIconItem) => {
    HapticService.selection();
    setCatIcon(item.id);
    setIsIconPickerOpen(false);
  };

  // Keyboard awareness & smart auto-scroll hook
  const {
    scrollViewRef: modalScrollRef,
    keyboardHeight,
    contentPaddingBottom: modalPaddingBottom,
    handleScrollLayout: handleModalScrollLayout,
    handleScroll: handleModalScroll,
    registerFieldLayout: registerModalFieldLayout,
    scrollToField: scrollToModalField,
    handleInputFocus: handleModalInputFocus,
  } = useKeyboardAwareScroll({
    topMargin: 20,
    bottomMargin: 24,
    defaultPaddingBottom: 48,
  });
  const fieldsListTopRef = useRef<number>(0);

  // Item counts per category
  const itemCounts = useMemo(() => {
    const map: Record<string, number> = {
      login: 0,
      card: 0,
      note: 0,
      other: 0,
    };
    for (const item of items) {
      map[item.category] = (map[item.category] || 0) + 1;
    }
    return map;
  }, [items]);

  // Close Builder Modal cleanly
  const handleCloseEditor = () => {
    Keyboard.dismiss();
    setIsEditorOpen(false);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    HapticService.selection();
    setEditingCategory(null);
    setCatName('');
    setCatColor(CURATED_CATEGORY_COLORS[0].hex);
    setCatIcon(CURATED_CATEGORY_ICONS[0].id);
    setFields([]);
    setNewOptionInputs({});
    setIsEditorOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (cat: CustomCategoryDefinition) => {
    HapticService.selection();
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatColor(cat.color);
    setCatIcon(cat.icon);
    setFields(cat.fields.map((f) => ({ ...f, options: f.options ? [...f.options] : [] })));
    setNewOptionInputs({});
    setIsEditorOpen(true);
  };

  // Toggle pinned category (max 5)
  const handleTogglePin = async (catId: string) => {
    HapticService.selection();
    const isPinned = pinnedCategoryIds.includes(catId);
    if (isPinned) {
      if (pinnedCategoryIds.length <= 1) {
        Alert.alert('Notice', 'At least one category must remain pinned to your action bar.');
        return;
      }
      await setPinnedCategoryIds(pinnedCategoryIds.filter((id) => id !== catId));
    } else {
      if (pinnedCategoryIds.length >= 5) {
        Alert.alert(
          'Maximum 5 Quick Actions',
          'You can pin up to 5 categories for instant 1-tap access on Home & + Button. All other categories are accessible via "••• More".\n\nUnpin another category first to pin this one.'
        );
        return;
      }
      await setPinnedCategoryIds([...pinnedCategoryIds, catId]);
    }
  };

  // Field schema actions
  const handleAddField = () => {
    HapticService.selection();
    const newField: FieldSchemaTemplate = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label: `Field ${fields.length + 1}`,
      type: 'text',
      placeholder: 'Enter value',
    };
    setFields((prev) => [...prev, newField]);
    handleModalInputFocus(newField.id);
  };

  const handleUpdateFieldLabel = (id: string, label: string) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, label } : f))
    );
  };

  const handleSelectFieldType = (type: CustomFieldType) => {
    if (!activeFieldIdForType) return;
    HapticService.selection();
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== activeFieldIdForType) return f;
        const updated: FieldSchemaTemplate = { ...f, type };
        if ((type === 'select' || type === 'multiselect') && !updated.options) {
          updated.options = [];
        }
        return updated;
      })
    );
    setActiveFieldIdForType(null);
  };

  const handleAddOptionToField = (fieldId: string) => {
    const text = (newOptionInputs[fieldId] || '').trim();
    if (!text) return;
    const splitOpts = text.split(',').map((s) => s.trim()).filter(Boolean);
    if (splitOpts.length === 0) return;
    HapticService.selection();
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const current = f.options || [];
        const newUnique = splitOpts.filter((o) => !current.includes(o));
        return { ...f, options: [...current, ...newUnique] };
      })
    );
    setNewOptionInputs((prev) => ({ ...prev, [fieldId]: '' }));
  };

  const handleRemoveOptionFromField = (fieldId: string, optIndex: number) => {
    HapticService.selection();
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const current = f.options || [];
        return { ...f, options: current.filter((_, idx) => idx !== optIndex) };
      })
    );
  };

  const handleRemoveField = (id: string) => {
    HapticService.selection();
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  // Save Category
  const handleSaveCategory = async () => {
    const trimmedName = catName.trim();
    if (!trimmedName) {
      Alert.alert('Category Name Required', 'Please provide a name for this custom category.');
      return;
    }

    try {
      if (editingCategory) {
        await updateCustomCategory({
          ...editingCategory,
          name: trimmedName,
          icon: catIcon,
          color: catColor,
          bgTint: `${catColor}1A`,
          fields,
        });
      } else {
        await addCustomCategory({
          name: trimmedName,
          icon: catIcon,
          color: catColor,
          bgTint: `${catColor}1A`,
          fields,
        });
      }
      await HapticService.success();
      handleCloseEditor();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save category.');
    }
  };

  // Delete Category
  const handleDeleteCategory = (cat: CustomCategoryDefinition) => {
    const count = itemCounts[cat.id] || 0;
    Alert.alert(
      `Delete "${cat.name}"?`,
      count > 0
        ? `This category contains ${count} ${count === 1 ? 'item' : 'items'}. Deleting will move them safely to the "Other" category. No secrets will be lost.`
        : 'Are you sure you want to remove this category?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Category',
          style: 'destructive',
          onPress: async () => {
            await deleteCustomCategory(cat.id);
            await HapticService.warning();
          },
        },
      ]
    );
  };

  // Preview Icon component
  const PreviewIconComponent = getCategoryIcon(catIcon);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title="Vault Customization" onBack={() => router.back()} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Playground Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconBox}>
              <Sparkles color="#3B82F6" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Category Playground</Text>
              <Text style={styles.heroSubtitle}>
                Create custom categories with predefined field templates (e.g. MFA tokens, server keys, crypto wallets). Pin up to 5 to your primary action bar.
              </Text>
            </View>
          </View>
        </View>

        {/* Action Bar / Pinned Summary Card */}
        <Text style={styles.sectionHeader}>Quick Action Bar (5 Max)</Text>
        <View style={styles.card}>
          <View style={styles.pinnedInfoRow}>
            <Text style={styles.pinnedCountText}>
              {pinnedCategoryIds.length} / 5 Pinned
            </Text>
            <Text style={styles.pinnedHelpText}>
              First 5 appear directly on Home & Speed Dial. Additional categories appear in "••• More".
            </Text>
          </View>

          {/* Mini preview strip of action bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionPreviewStrip}
          >
            {pinnedCategoryIds.map((id) => {
              const isBuiltin = id === 'login' || id === 'card' || id === 'note';
              const name = isBuiltin
                ? CATEGORY_THEMES[id]?.name || id
                : customCategories.find((c) => c.id === id)?.name || id;
              const color = isBuiltin
                ? CATEGORY_THEMES[id]?.color || '#007AFF'
                : customCategories.find((c) => c.id === id)?.color || '#007AFF';

              return (
                <View key={id} style={[styles.actionPill, { borderColor: color }]}>
                  <View style={[styles.actionPillDot, { backgroundColor: color }]} />
                  <Text style={styles.actionPillText} numberOfLines={1}>
                    {name}
                  </Text>
                </View>
              );
            })}
            {pinnedCategoryIds.length > 0 && (
              <View style={[styles.actionPill, styles.actionPillMore]}>
                <Text style={styles.actionPillMoreText}>••• More</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Custom Categories Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Custom Categories</Text>
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={handleOpenCreate}
            activeOpacity={0.7}
          >
            <Plus color="#007AFF" size={16} />
            <Text style={styles.headerAddBtnText}>New Category</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {customCategories.length === 0 ? (
            <View style={styles.emptyCustomBox}>
              <View style={styles.emptyIconCircle}>
                <Layers color="#8E8E93" size={24} />
              </View>
              <Text style={styles.emptyTitle}>No Custom Categories Yet</Text>
              <Text style={styles.emptySubtitle}>
                Add specialized categories like MFA & Recovery Codes, SSH Keys, or Crypto Wallets with custom fields.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={handleOpenCreate}
                activeOpacity={0.8}
              >
                <Plus color="#FFFFFF" size={16} style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionBtnText}>Create First Category</Text>
              </TouchableOpacity>
            </View>
          ) : (
            customCategories.map((cat, idx) => {
              const IconComp = getCategoryIcon(cat.icon);
              const isPinned = pinnedCategoryIds.includes(cat.id);
              const count = itemCounts[cat.id] || 0;

              return (
                <React.Fragment key={cat.id}>
                  {idx > 0 && <View style={styles.rowSeparator} />}
                  <View style={styles.catRow}>
                    <TouchableOpacity
                      style={styles.catRowMain}
                      onPress={() => handleOpenEdit(cat)}
                      activeOpacity={0.6}
                    >
                      <View
                        style={[
                          styles.catIconSquare,
                          { backgroundColor: cat.bgTint || `${cat.color}1A` },
                        ]}
                      >
                        <IconComp color={cat.color} size={20} />
                      </View>
                      <View style={styles.catInfo}>
                        <View style={styles.catTitleRow}>
                          <Text style={styles.catName} numberOfLines={1}>
                            {cat.name}
                          </Text>
                        </View>
                        <Text style={styles.catSubtitle}>
                          {cat.fields.length} {cat.fields.length === 1 ? 'field' : 'fields'} • {count}{' '}
                          {count === 1 ? 'item' : 'items'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Actions: Pin toggle, Edit, Delete */}
                    <View style={styles.catRowActions}>
                      <TouchableOpacity
                        style={[styles.pinBtn, isPinned && styles.pinBtnActive]}
                        onPress={() => handleTogglePin(cat.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Star
                          color={isPinned ? '#F59E0B' : '#C7C7CC'}
                          size={18}
                          fill={isPinned ? '#F59E0B' : 'transparent'}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => handleOpenEdit(cat)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Edit2 color="#007AFF" size={16} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteCategory(cat)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 color="#FF3B30" size={16} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </React.Fragment>
              );
            })
          )}
        </View>

        {/* Built-in Categories Section */}
        <Text style={styles.sectionHeader}>Built-in Categories</Text>
        <View style={styles.card}>
          {(['login', 'card', 'note'] as const).map((builtinId, idx) => {
            const theme = CATEGORY_THEMES[builtinId];
            const IconComp = theme.icon;
            const isPinned = pinnedCategoryIds.includes(builtinId);
            const count = itemCounts[builtinId] || 0;

            return (
              <React.Fragment key={builtinId}>
                {idx > 0 && <View style={styles.rowSeparator} />}
                <View style={styles.catRow}>
                  <View style={styles.catRowMain}>
                    <View
                      style={[
                        styles.catIconSquare,
                        { backgroundColor: theme.bgTint },
                      ]}
                    >
                      <IconComp color={theme.color} size={20} />
                    </View>
                    <View style={styles.catInfo}>
                      <Text style={styles.catName}>{theme.name}</Text>
                      <Text style={styles.catSubtitle}>
                        Built-in system category • {count} {count === 1 ? 'item' : 'items'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.pinBtn, isPinned && styles.pinBtnActive]}
                    onPress={() => handleTogglePin(builtinId)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Star
                      color={isPinned ? '#F59E0B' : '#C7C7CC'}
                      size={18}
                      fill={isPinned ? '#F59E0B' : 'transparent'}
                    />
                  </TouchableOpacity>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>

      {/* CATEGORY BUILDER / EDITOR MODAL */}
      <Modal
        visible={isEditorOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseEditor}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={handleCloseEditor}
                style={styles.modalCloseBtn}
              >
                <X color="#8E8E93" size={20} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingCategory ? 'Edit Category' : 'New Custom Category'}
              </Text>
              <TouchableOpacity
                onPress={handleSaveCategory}
                style={styles.modalSaveBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSaveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={modalScrollRef}
              style={styles.modalScroll}
              contentContainerStyle={[
                styles.modalScrollContent,
                { paddingBottom: modalPaddingBottom },
              ]}
              onLayout={handleModalScrollLayout}
              onScroll={handleModalScroll}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Live Preview Card */}
              <View style={styles.previewContainer}>
                <View
                  style={[
                    styles.previewIconBox,
                    { backgroundColor: `${catColor}20` },
                  ]}
                >
                  <PreviewIconComponent color={catColor} size={28} />
                </View>
                <View style={styles.previewMeta}>
                  <Text style={styles.previewTitle}>
                    {catName.trim() || 'Category Name'}
                  </Text>
                  <Text style={styles.previewSubtitle}>
                    {fields.length} {fields.length === 1 ? 'field template' : 'field templates'} defined
                  </Text>
                </View>
              </View>

              {/* Category Name Input */}
              <Text style={styles.modalSectionLabel}>Category Name</Text>
              <View
                style={styles.inputContainer}
                onLayout={(e) => {
                  registerModalFieldLayout(
                    'catName',
                    e.nativeEvent.layout.y,
                    e.nativeEvent.layout.height
                  );
                }}
              >
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. MFA Tokens, Server Keys, Crypto"
                  placeholderTextColor="#8E8E93"
                  value={catName}
                  onChangeText={setCatName}
                  autoCapitalize="words"
                  onFocus={() => handleModalInputFocus('catName')}
                />
              </View>

              {/* Color Picker */}
              <Text style={styles.modalSectionLabel}>Theme Color</Text>
              <View style={styles.colorRow}>
                {CURATED_CATEGORY_COLORS.map((c) => {
                  const isSelected = catColor.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={c.hex}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: c.hex },
                        isSelected && styles.colorCircleSelected,
                      ]}
                      onPress={() => {
                        HapticService.selection();
                        setCatColor(c.hex);
                      }}
                      activeOpacity={0.7}
                    >
                      {isSelected && <Check color="#FFFFFF" size={16} strokeWidth={3} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Icon Selector Header & Action */}
              <View style={styles.iconSectionHeaderRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.modalSectionLabel}>Category Icon</Text>
                  <Text style={styles.modalSectionDesc}>
                    Choose from 110+ icons, select an emoji, or search.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.searchIconsPill, { borderColor: catColor }]}
                  onPress={() => {
                    Keyboard.dismiss();
                    HapticService.selection();
                    setIconSearchQuery('');
                    setSelectedIconGroup('all');
                    setIsIconPickerOpen(true);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Search color={catColor} size={13} style={{ marginRight: 5 }} />
                  <Text style={[styles.searchIconsPillText, { color: catColor }]}>
                    Search All (110+)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Active Icon Display Card */}
              <TouchableOpacity
                style={[
                  styles.activeIconCard,
                  { borderColor: `${catColor}50`, backgroundColor: '#FFFFFF' },
                ]}
                onPress={() => {
                  Keyboard.dismiss();
                  HapticService.selection();
                  setIconSearchQuery('');
                  setSelectedIconGroup('all');
                  setIsIconPickerOpen(true);
                }}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.activeIconSquircle,
                    { backgroundColor: `${catColor}20`, borderColor: catColor },
                  ]}
                >
                  <PreviewIconComponent color={catColor} size={24} />
                </View>
                <View style={styles.activeIconMeta}>
                  <Text style={styles.activeIconTitle}>
                    {getIconLabel(catIcon)}
                  </Text>
                  <Text style={styles.activeIconSubtitle}>
                    Tap to search & browse full library or enter any emoji
                  </Text>
                </View>
                <ChevronRight color="#8E8E93" size={18} />
              </TouchableOpacity>

              {/* Quick Pick Horizontal Strip */}
              <Text style={styles.quickPickLabel}>POPULAR QUICK-PICKS</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickPickScroll}
              >
                {QUICK_PICK_ICONS.map((item) => {
                  const isSelected = catIcon === item.id;
                  const QuickComp = getCategoryIcon(item.id);

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.quickPickChip,
                        isSelected && {
                          backgroundColor: `${catColor}22`,
                          borderColor: catColor,
                          borderWidth: 1.5,
                        },
                      ]}
                      onPress={() => {
                        HapticService.selection();
                        setCatIcon(item.id);
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    >
                      <QuickComp
                        color={isSelected ? catColor : '#475569'}
                        size={17}
                      />
                      <Text
                        style={[
                          styles.quickPickChipText,
                          isSelected && { color: catColor, fontWeight: '700' },
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.quickPickMoreChip, { borderColor: catColor }]}
                  onPress={() => {
                    Keyboard.dismiss();
                    HapticService.selection();
                    setIconSearchQuery('');
                    setSelectedIconGroup('all');
                    setIsIconPickerOpen(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Search color={catColor} size={13} style={{ marginRight: 4 }} />
                  <Text style={[styles.quickPickMoreText, { color: catColor }]}>More...</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Field Schema Playground */}
              <View style={styles.fieldHeaderRow}>
                <View style={styles.fieldHeaderTitles}>
                  <Text style={styles.modalSectionLabel}>Predefined Field Templates</Text>
                  <Text style={styles.modalSectionDesc}>
                    Auto-populated whenever you create an item in this category.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addFieldPill}
                  onPress={handleAddField}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Plus color="#007AFF" size={14} />
                  <Text style={styles.addFieldPillText}>Add Field</Text>
                </TouchableOpacity>
              </View>

              {fields.length === 0 ? (
                <View style={styles.emptyFieldsBox}>
                  <Text style={styles.emptyFieldsText}>
                    No fields added yet. Tap "+ Add Field" above to define the exact fields you want in this category.
                  </Text>
                </View>
              ) : (
                <View
                  style={styles.fieldsList}
                  onLayout={(e) => {
                    fieldsListTopRef.current = e.nativeEvent.layout.y;
                  }}
                >
                  {fields.map((field, idx) => {
                    const currentType = FIELD_TYPE_OPTIONS.find((t) => t.type === field.type) || FIELD_TYPE_OPTIONS[0];
                    const TypeIcon = currentType.icon;

                    return (
                      <View
                        key={field.id}
                        style={styles.fieldRowCard}
                        onLayout={(e) => {
                          registerModalFieldLayout(
                            field.id,
                            (fieldsListTopRef.current || 0) + e.nativeEvent.layout.y,
                            e.nativeEvent.layout.height
                          );
                        }}
                      >
                        <View style={styles.fieldRowCardHeader}>
                          <View style={styles.fieldNumberBadge}>
                            <Text style={styles.fieldNumberText}>{idx + 1}</Text>
                          </View>

                          {/* Field Label Input */}
                          <TextInput
                            style={styles.fieldLabelInput}
                            value={field.label}
                            onChangeText={(txt) => handleUpdateFieldLabel(field.id, txt)}
                            placeholder="Field label"
                            placeholderTextColor="#8E8E93"
                            onFocus={() => handleModalInputFocus(field.id)}
                          />

                          {/* Type Picker Trigger */}
                          <TouchableOpacity
                            style={styles.fieldTypePickerBtn}
                            onPress={() => {
                              Keyboard.dismiss();
                              HapticService.selection();
                              setActiveFieldIdForType(field.id);
                            }}
                            activeOpacity={0.7}
                          >
                            <TypeIcon color="#007AFF" size={14} style={{ marginRight: 4 }} />
                            <Text style={styles.fieldTypePickerBtnText} numberOfLines={1}>
                              {currentType.label.split(' ')[0]}
                            </Text>
                          </TouchableOpacity>

                          {/* Delete Field */}
                          <TouchableOpacity
                            style={styles.fieldDeleteBtn}
                            onPress={() => handleRemoveField(field.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Trash2 color="#FF3B30" size={16} />
                          </TouchableOpacity>
                        </View>

                        {/* Options configuration if select or multiselect */}
                        {(field.type === 'select' || field.type === 'multiselect') && (
                          <View style={styles.fieldOptionsSection}>
                            <View style={styles.fieldOptionsHeader}>
                              <Text style={styles.fieldOptionsTitle}>
                                {field.type === 'select' ? 'Dropdown Choices' : 'Multi-Select Choices'}
                              </Text>
                              <Text style={styles.fieldOptionsCount}>
                                {(field.options || []).length} {(field.options || []).length === 1 ? 'choice' : 'choices'}
                              </Text>
                            </View>

                            {/* Configured Option Tags */}
                            {field.options && field.options.length > 0 ? (
                              <View style={styles.optionsChipsRow}>
                                {field.options.map((opt, optIdx) => (
                                  <View key={optIdx} style={styles.optionChip}>
                                    <Text style={styles.optionChipText} numberOfLines={1}>
                                      {opt}
                                    </Text>
                                    <TouchableOpacity
                                      onPress={() => handleRemoveOptionFromField(field.id, optIdx)}
                                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                      style={styles.optionChipDelete}
                                    >
                                      <X color="#8E8E93" size={12} />
                                    </TouchableOpacity>
                                  </View>
                                ))}
                              </View>
                            ) : (
                              <Text style={styles.noOptionsHint}>
                                No choices defined yet. Add options below (e.g. Admin, Editor, Viewer).
                              </Text>
                            )}

                            {/* Add Option Input Row */}
                            <View style={styles.addOptionRow}>
                              <TextInput
                                style={styles.addOptionTextInput}
                                placeholder="Add choice (or comma-separated)..."
                                placeholderTextColor="#8E8E93"
                                value={newOptionInputs[field.id] || ''}
                                onChangeText={(val) =>
                                  setNewOptionInputs((prev) => ({ ...prev, [field.id]: val }))
                                }
                                onFocus={() => handleModalInputFocus(field.id)}
                                onSubmitEditing={() => handleAddOptionToField(field.id)}
                                returnKeyType="done"
                              />
                              <TouchableOpacity
                                style={styles.addOptionButton}
                                onPress={() => handleAddOptionToField(field.id)}
                                activeOpacity={0.7}
                              >
                                <Plus color="#007AFF" size={14} style={{ marginRight: 4 }} />
                                <Text style={styles.addOptionButtonText}>Add</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>

        {/* Sub-modal: Field Type Picker */}
        <Modal
          visible={activeFieldIdForType !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveFieldIdForType(null)}
        >
          <TouchableOpacity
            style={styles.typeModalOverlay}
            activeOpacity={1}
            onPress={() => setActiveFieldIdForType(null)}
          >
            <View style={styles.typeModalSheet}>
              <View style={styles.typeModalHeader}>
                <Text style={styles.typeModalTitle}>Select Field Type</Text>
                <TouchableOpacity
                  onPress={() => setActiveFieldIdForType(null)}
                  style={styles.typeModalCloseBtn}
                >
                  <X color="#8E8E93" size={18} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {FIELD_TYPE_OPTIONS.map((opt) => {
                  const IconC = opt.icon;
                  return (
                    <TouchableOpacity
                      key={opt.type}
                      style={styles.typeOptionRow}
                      onPress={() => handleSelectFieldType(opt.type)}
                      activeOpacity={0.6}
                    >
                      <View style={styles.typeOptionIconBox}>
                        <IconC color="#007AFF" size={18} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.typeOptionTitle}>{opt.label}</Text>
                        <Text style={styles.typeOptionDesc}>{opt.desc}</Text>
                      </View>
                      <ChevronRight color="#C7C7CC" size={16} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </Modal>

      {/* FULL ICON & EMOJI PICKER MODAL */}
      <Modal
        visible={isIconPickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsIconPickerOpen(false)}
      >
        <SafeAreaView style={styles.iconModalSafeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {/* Modal Header */}
            <View style={styles.iconModalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.iconModalTitle}>Choose Category Icon</Text>
                <Text style={styles.iconModalSubtitle}>
                  110+ icons & emojis, or enter any custom emoji
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsIconPickerOpen(false)}
                style={styles.iconModalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X color="#8E8E93" size={20} />
              </TouchableOpacity>
            </View>

            {/* Search Input Bar */}
            <View style={styles.iconSearchRow}>
              <Search size={16} color="#8E8E93" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.iconSearchInput}
                placeholder="Search icons & emojis (car, bank, 🚀)..."
                placeholderTextColor="#8E8E93"
                value={iconSearchQuery}
                onChangeText={setIconSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {iconSearchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setIconSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={15} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Filter Tabs */}
            <View style={styles.iconTabsWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.iconTabsScroll}
              >
                {CATEGORY_ICON_GROUPS.map((grp) => {
                  const isSelected = selectedIconGroup === grp.key;
                  return (
                    <TouchableOpacity
                      key={grp.key}
                      style={[
                        styles.iconTabChip,
                        isSelected && {
                          backgroundColor: catColor,
                          borderColor: catColor,
                        },
                      ]}
                      onPress={() => {
                        HapticService.selection();
                        setSelectedIconGroup(grp.key);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.iconTabChipText,
                          isSelected && { color: '#FFFFFF', fontWeight: '700' },
                        ]}
                      >
                        {grp.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Icons Scroll View */}
            <ScrollView
              style={styles.iconGridScroll}
              contentContainerStyle={styles.iconGridScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* If user typed an emoji in the search bar */}
              {typedEmojiInSearch && (
                <TouchableOpacity
                  style={[styles.typedEmojiPrompt, { borderColor: catColor }]}
                  onPress={() => {
                    HapticService.success();
                    setCatIcon(`emoji:${typedEmojiInSearch}`);
                    setIsIconPickerOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.typedEmojiAvatar,
                      { backgroundColor: `${catColor}20` },
                    ]}
                  >
                    <Text style={{ fontSize: 28 }}>{typedEmojiInSearch}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.typedEmojiPromptTitle}>
                      Use "{typedEmojiInSearch}" as Icon
                    </Text>
                    <Text style={styles.typedEmojiPromptDesc}>
                      Tap to apply this custom emoji directly
                    </Text>
                  </View>
                  <Check color={catColor} size={22} strokeWidth={2.5} />
                </TouchableOpacity>
              )}

              {/* Custom Emoji Input Box */}
              <View style={styles.customEmojiBox}>
                <View style={styles.customEmojiHeader}>
                  <Smile size={14} color="#64748B" style={{ marginRight: 6 }} />
                  <Text style={styles.customEmojiLabel}>CUSTOM EMOJI</Text>
                </View>
                <View style={styles.customEmojiInputWrapper}>
                  <View
                    style={[
                      styles.customEmojiPreviewSquare,
                      {
                        backgroundColor: isEmojiIcon(customEmojiText.trim())
                          ? `${catColor}18`
                          : '#F2F2F7',
                        borderColor: isEmojiIcon(customEmojiText.trim())
                          ? catColor
                          : '#E5E5EA',
                      },
                    ]}
                  >
                    {isEmojiIcon(customEmojiText.trim()) ? (
                      <Text style={{ fontSize: 22 }}>
                        {cleanEmoji(customEmojiText.trim())}
                      </Text>
                    ) : (
                      <Smile size={20} color="#8E8E93" strokeWidth={2} />
                    )}
                  </View>
                  <TextInput
                    style={styles.customEmojiField}
                    placeholder="Type or paste any emoji (e.g. 🚀, 🥑)..."
                    placeholderTextColor="#8E8E93"
                    value={customEmojiText}
                    onChangeText={setCustomEmojiText}
                    maxLength={10}
                  />
                  <TouchableOpacity
                    style={[
                      styles.customEmojiSetBtn,
                      {
                        backgroundColor: isEmojiIcon(customEmojiText.trim())
                          ? catColor
                          : '#E5E5EA',
                      },
                    ]}
                    disabled={!isEmojiIcon(customEmojiText.trim())}
                    onPress={() => {
                      const clean = cleanEmoji(customEmojiText.trim());
                      HapticService.success();
                      setCatIcon(`emoji:${clean}`);
                      setCustomEmojiText('');
                      setIsIconPickerOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.customEmojiSetBtnText,
                        {
                          color: isEmojiIcon(customEmojiText.trim())
                            ? '#FFFFFF'
                            : '#8E8E93',
                        },
                      ]}
                    >
                      Use
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Filtered Icons Results */}
              {filteredIcons.length === 0 ? (
                <View style={styles.emptyIconsState}>
                  <Text style={styles.emptyIconsTitle}>No matching icons found</Text>
                  <Text style={styles.emptyIconsSubtitle}>
                    Try searching with another keyword or enter any custom emoji above!
                  </Text>
                </View>
              ) : (
                <View style={styles.pickerGrid}>
                  {filteredIcons.map((item) => {
                    const isSelected = catIcon === item.id;
                    const IconComp = item.icon;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.pickerCard,
                          isSelected && {
                            backgroundColor: `${catColor}18`,
                            borderColor: catColor,
                            borderWidth: 2,
                          },
                        ]}
                        onPress={() => handleSelectPickerIcon(item)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={item.label}
                      >
                        <View style={styles.pickerCardIconBox}>
                          {item.isEmoji ? (
                            <Text style={{ fontSize: 26, textAlign: 'center' }}>
                              {item.emojiChar}
                            </Text>
                          ) : IconComp ? (
                            <IconComp
                              color={isSelected ? catColor : '#334155'}
                              size={22}
                              strokeWidth={2.2}
                            />
                          ) : null}
                        </View>
                        <Text
                          style={[
                            styles.pickerCardLabel,
                            isSelected && { color: catColor, fontWeight: '700' },
                          ]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },

  // Hero Banner
  heroBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },

  // Section Headers
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6D6D72',
    textTransform: 'uppercase',
    letterSpacing: -0.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerAddBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 4,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 16,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginLeft: 58,
  },

  // Pinned action bar preview
  pinnedInfoRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  pinnedCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  pinnedHelpText: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  actionPreviewStrip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 6,
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    maxWidth: 90,
  },
  actionPillMore: {
    borderColor: '#94A3B8',
    backgroundColor: '#F1F5F9',
  },
  actionPillMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  // Custom Category Row
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  catRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  catIconSquare: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  catInfo: {
    flex: 1,
  },
  catTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  catSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  catRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pinBtn: {
    padding: 6,
  },
  pinBtnActive: {},
  editBtn: {
    padding: 6,
  },
  deleteBtn: {
    padding: 6,
  },

  // Empty custom state
  emptyCustomBox: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  modalSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#007AFF',
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
  },

  // Preview Card
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  previewIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  previewMeta: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  previewSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },

  // Modal Section
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6D6D72',
    textTransform: 'uppercase',
    letterSpacing: -0.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  modalSectionDesc: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  textInput: {
    fontSize: 15,
    color: '#000000',
    paddingVertical: 12,
  },

  // Color picker
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 20,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleSelected: {
    transform: [{ scale: 1.15 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },

  // Icon Grid
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  iconOption: {
    width: '23%',
    aspectRatio: 1.2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  iconOptionText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },

  // Field Schema
  fieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  fieldHeaderTitles: {
    flex: 1,
    paddingRight: 12,
  },
  addFieldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#007AFF',
    flexShrink: 0,
  },
  addFieldPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 4,
  },
  emptyFieldsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyFieldsText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
  },
  fieldsList: {
    gap: 8,
    marginBottom: 20,
  },
  fieldRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  fieldRowCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  fieldNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
  },
  fieldLabelInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14.5,
    color: '#000000',
    paddingVertical: 8,
    minHeight: 38,
    marginRight: 8,
  },
  fieldTypePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 6,
    flexShrink: 0,
  },
  fieldTypePickerBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  fieldDeleteBtn: {
    padding: 4,
    flexShrink: 0,
  },
  fieldOptionsSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  fieldOptionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldOptionsTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  fieldOptionsCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  optionsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1C1C1E',
    marginRight: 4,
  },
  optionChipDelete: {
    padding: 2,
  },
  noOptionsHint: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  addOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addOptionTextInput: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12.5,
    color: '#000000',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  addOptionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
  },

  // Sub-modal: Field Type Picker
  typeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  typeModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  typeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  typeModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  typeModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
  },
  typeOptionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  typeOptionDesc: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },

  // Icon Section in Builder
  iconSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  searchIconsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    flexShrink: 0,
  },
  searchIconsPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeIconCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  activeIconSquircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activeIconMeta: {
    flex: 1,
  },
  activeIconTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  activeIconSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  quickPickLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  quickPickScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 16,
  },
  quickPickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 6,
  },
  quickPickChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  quickPickMoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
  },
  quickPickMoreText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Icon Picker Modal Styles
  iconModalSafeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  iconModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  iconModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  iconModalSubtitle: {
    fontSize: 12.5,
    color: '#8E8E93',
    marginTop: 2,
  },
  iconModalCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
  },
  iconSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  iconSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000000',
    paddingVertical: 0,
  },
  iconTabsWrapper: {
    backgroundColor: '#F2F2F7',
    paddingBottom: 10,
  },
  iconTabsScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  iconTabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  iconTabChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  iconGridScroll: {
    flex: 1,
  },
  iconGridScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  typedEmojiPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  typedEmojiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typedEmojiPromptTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  typedEmojiPromptDesc: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  customEmojiBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 14,
  },
  customEmojiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customEmojiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  customEmojiInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customEmojiPreviewSquare: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customEmojiField: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#000000',
  },
  customEmojiSetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  customEmojiSetBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyIconsState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyIconsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  emptyIconsSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 280,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerCard: {
    width: '23%',
    minHeight: 70,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  pickerCardIconBox: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerCardLabel: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
});
