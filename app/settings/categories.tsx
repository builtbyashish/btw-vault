import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { AppHeader } from '../../src/components/AppHeader';
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
} from 'lucide-react-native';
import { useVault } from '../../src/context/VaultContext';
import {
  CustomCategoryDefinition,
  FieldSchemaTemplate,
  CustomFieldType,
} from '../../src/types';
import {
  CURATED_CATEGORY_COLORS,
  CURATED_CATEGORY_ICONS,
  CATEGORY_ICON_MAP,
  CATEGORY_THEMES,
} from '../../src/theme/categoryColors';
import { HapticService } from '../../src/core/haptics';

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
      setIsEditorOpen(false);
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
  const PreviewIconComponent = CATEGORY_ICON_MAP[catIcon] || Folder;

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
              const IconComp = CATEGORY_ICON_MAP[cat.icon] || Folder;
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
        onRequestClose={() => setIsEditorOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setIsEditorOpen(false)}
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
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
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
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. MFA Tokens, Server Keys, Crypto"
                  placeholderTextColor="#8E8E93"
                  value={catName}
                  onChangeText={setCatName}
                  autoCapitalize="words"
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

              {/* Icon Selector */}
              <Text style={styles.modalSectionLabel}>Category Icon</Text>
              <View style={styles.iconGrid}>
                {CURATED_CATEGORY_ICONS.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = catIcon === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.iconOption,
                        isSelected && {
                          backgroundColor: `${catColor}20`,
                          borderColor: catColor,
                        },
                      ]}
                      onPress={() => {
                        HapticService.selection();
                        setCatIcon(item.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <IconComp
                        color={isSelected ? catColor : '#475569'}
                        size={20}
                      />
                      <Text
                        style={[
                          styles.iconOptionText,
                          isSelected && { color: catColor, fontWeight: '600' },
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

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
                <View style={styles.fieldsList}>
                  {fields.map((field, idx) => {
                    const currentType = FIELD_TYPE_OPTIONS.find((t) => t.type === field.type) || FIELD_TYPE_OPTIONS[0];
                    const TypeIcon = currentType.icon;

                    return (
                      <View key={field.id} style={styles.fieldRowCard}>
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
                          />

                          {/* Type Picker Trigger */}
                          <TouchableOpacity
                            style={styles.fieldTypePickerBtn}
                            onPress={() => {
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

              <View style={{ height: 40 }} />
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
    fontSize: 14,
    color: '#000000',
    paddingVertical: 4,
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
});
