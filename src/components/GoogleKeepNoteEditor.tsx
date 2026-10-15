import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Pin,
  Palette,
  Check,
  CheckSquare,
  Square,
  Tag,
  Plus,
  X,
  Trash2,
  ListTodo,
} from 'lucide-react-native';
import { HapticService } from '../core/haptics';
import { AppHeaderBackButton } from './AppHeaderBackButton';
import { VAULT_LIMITS } from '../core/security/vaultLimits';

export interface KeepNoteData {
  title: string;
  notes: string;
  tags: string[];
  isPinned: boolean;
  color?: string;
}

interface GoogleKeepNoteEditorProps {
  mode: 'create' | 'edit';
  initialData?: Partial<KeepNoteData>;
  updatedAt?: string;
  onSave: (data: KeepNoteData) => Promise<void> | void;
  onBack: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

// 9 Signature Google Keep Pastel Colors (carefully calibrated for high-contrast dark text)
export const GOOGLE_KEEP_COLORS = [
  { id: 'default', color: '#FFFFFF', name: 'Default', border: '#E5E7EB' },
  { id: 'coral', color: '#FEE2E2', name: 'Coral', border: '#FECACA' },
  { id: 'peach', color: '#FFEDD5', name: 'Peach', border: '#FED7AA' },
  { id: 'sand', color: '#FEF9C3', name: 'Sand', border: '#FEF08A' },
  { id: 'mint', color: '#DCFCE7', name: 'Mint', border: '#BBF7D0' },
  { id: 'teal', color: '#E0F2FE', name: 'Teal', border: '#BAE6FD' },
  { id: 'lavender', color: '#EDE9FE', name: 'Lavender', border: '#DDD6FE' },
  { id: 'blossom', color: '#FCE7F3', name: 'Blossom', border: '#FBCFE8' },
  { id: 'clay', color: '#F5F5F4', name: 'Clay', border: '#E7E5E4' },
];

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export const GoogleKeepNoteEditor: React.FC<GoogleKeepNoteEditorProps> = ({
  mode,
  initialData,
  updatedAt,
  onSave,
  onBack,
  onDelete,
  isLoading = false,
}) => {
  const insets = useSafeAreaInsets();

  // Core state
  const [title, setTitle] = useState(initialData?.title || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [isPinned, setIsPinned] = useState(initialData?.isPinned || false);
  const [noteColor, setNoteColor] = useState<string>(
    initialData?.color || '#FFFFFF'
  );

  // UI Panels
  const [showPalette, setShowPalette] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagText, setNewTagText] = useState('');
  const [isChecklistMode, setIsChecklistMode] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  // Keyboard offset tracking
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // References
  const titleInputRef = useRef<TextInput>(null);
  const bodyInputRef = useRef<TextInput>(null);
  const tagInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Parse notes into checklist items or detect if checklist format
  useEffect(() => {
    if (initialData?.notes) {
      const lines = initialData.notes.split('\n');
      const isChecklistPattern = lines.some(
        (l) => l.startsWith('[ ] ') || l.startsWith('[x] ')
      );

      if (isChecklistPattern) {
        setIsChecklistMode(true);
        const parsed: ChecklistItem[] = lines
          .filter((l) => l.trim().length > 0)
          .map((l, idx) => ({
            id: `item_${Date.now()}_${idx}`,
            completed: l.startsWith('[x] '),
            text: l.replace(/^\[[ x]\]\s*/, ''),
          }));
        setChecklistItems(
          parsed.length > 0
            ? parsed
            : [{ id: `item_${Date.now()}`, text: '', completed: false }]
        );
      }
    }
  }, []);

  // Keyboard awareness
  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Format checklist items back to plain text
  const serializeNotes = (): string => {
    if (isChecklistMode) {
      return checklistItems
        .filter((it) => it.text.trim().length > 0)
        .map((it) => `[${it.completed ? 'x' : ' '}] ${it.text}`)
        .join('\n');
    }
    return notes;
  };

  // Toggle checklist mode
  const handleToggleChecklist = () => {
    HapticService.selection();
    if (isChecklistMode) {
      // Convert checklist back to plain lines
      const plain = checklistItems
        .filter((it) => it.text.trim().length > 0)
        .map((it) => it.text)
        .join('\n');
      setNotes(plain);
      setIsChecklistMode(false);
    } else {
      // Convert plain text to checklist
      const lines = notes.split('\n').filter((l) => l.trim().length > 0);
      const items: ChecklistItem[] =
        lines.length > 0
          ? lines.map((line, idx) => ({
              id: `item_${Date.now()}_${idx}`,
              text: line.replace(/^\[[ x]\]\s*/, ''),
              completed: line.startsWith('[x] '),
            }))
          : [{ id: `item_${Date.now()}`, text: '', completed: false }];
      setChecklistItems(items);
      setIsChecklistMode(true);
    }
  };

  // Checklist manipulations
  const handleToggleCheckItem = (id: string) => {
    HapticService.selection();
    setChecklistItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleUpdateCheckText = (id: string, text: string) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text } : item))
    );
  };

  const handleAddCheckItem = () => {
    HapticService.selection();
    const newId = `item_${Date.now()}_${Math.random()}`;
    const newItem: ChecklistItem = {
      id: newId,
      text: '',
      completed: false,
    };
    setChecklistItems((prev) => [...prev, newItem]);
    setFocusedItemId(newId);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 80);
  };

  const handleDeleteCheckItem = (id: string) => {
    HapticService.selection();
    setChecklistItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Tag management
  const handleAddTag = () => {
    const trimmed = newTagText.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      HapticService.selection();
      setTags([...tags, trimmed]);
      setNewTagText('');
      setShowTagInput(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    HapticService.selection();
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Save handler
  const handleSaveNote = async () => {
    const finalNotes = serializeNotes();
    const cleanTitle = title.trim();

    // If completely empty on create, just exit cleanly
    if (mode === 'create' && !cleanTitle && !finalNotes && tags.length === 0) {
      onBack();
      return;
    }

    await onSave({
      title: cleanTitle || 'Untitled Note',
      notes: finalNotes,
      tags,
      isPinned,
      color: noteColor,
    });
  };

  // Exit & Auto-save on Back
  const handleBack = async () => {
    await handleSaveNote();
  };

  // Format timestamp
  const formatTime = () => {
    if (updatedAt) {
      try {
        const d = new Date(updatedAt);
        return `Edited ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } catch {
        return 'Edited recently';
      }
    }
    return 'Edited just now';
  };

  const activeChecklist = checklistItems.filter((it) => !it.completed);
  const completedChecklist = checklistItems.filter((it) => it.completed);

  return (
    <View style={[styles.container, { backgroundColor: noteColor }]}>
      {/* 1. SEAMLESS TOP GOOGLE KEEP HEADER */}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 12) + 4 },
        ]}
      >
        <AppHeaderBackButton
          onPress={handleBack}
          style={{ marginLeft: 0, marginRight: 0 }}
        />

        <View style={styles.headerActionsRight}>
          {/* Pin Toggle */}
          <TouchableOpacity
            onPress={() => {
              HapticService.selection();
              setIsPinned(!isPinned);
            }}
            style={[
              styles.headerIconButton,
              isPinned && styles.headerIconButtonActive,
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            activeOpacity={0.7}
            accessibilityLabel={isPinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin
              size={20}
              color={isPinned ? '#D97706' : '#4B5563'}
              fill={isPinned ? '#D97706' : 'transparent'}
              strokeWidth={2.2}
            />
          </TouchableOpacity>

          {/* Palette Color Picker Toggle */}
          <TouchableOpacity
            onPress={() => {
              HapticService.selection();
              setShowPalette(!showPalette);
            }}
            style={[
              styles.headerIconButton,
              showPalette && styles.headerIconButtonActive,
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            activeOpacity={0.7}
            accessibilityLabel="Pick note color"
          >
            <Palette size={20} color={showPalette ? '#4F46E5' : '#4B5563'} strokeWidth={2.2} />
          </TouchableOpacity>

          {/* Delete (if editing) */}
          {mode === 'edit' && onDelete && (
            <TouchableOpacity
              onPress={onDelete}
              style={styles.headerIconButton}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              activeOpacity={0.7}
              accessibilityLabel="Delete note"
            >
              <Trash2 size={19} color="#EF4444" strokeWidth={2.2} />
            </TouchableOpacity>
          )}

          {/* Check / Save Button */}
          <TouchableOpacity
            onPress={handleSaveNote}
            disabled={isLoading}
            style={styles.saveCheckButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
            accessibilityLabel="Done editing"
          >
            <Check size={20} color="#FFFFFF" strokeWidth={2.8} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. GOOGLE KEEP COLOR PALETTE STRIP (Animated drawer) */}
      {showPalette && (
        <View style={styles.paletteContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.paletteScrollContent}
          >
            {GOOGLE_KEEP_COLORS.map((item) => {
              const isSelected = noteColor.toLowerCase() === item.color.toLowerCase();
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    HapticService.selection();
                    setNoteColor(item.color);
                  }}
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: item.color,
                      borderColor: item.border,
                    },
                    isSelected && styles.colorSwatchSelected,
                  ]}
                  activeOpacity={0.8}
                >
                  {isSelected && (
                    <Check size={14} color="#1F2937" strokeWidth={3} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 3. OPEN CANVAS NOTE BODY & TOOLBAR (Keyboard Avoiding) */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.canvasScrollView}
          contentContainerStyle={[
            styles.canvasContent,
            { paddingBottom: keyboardHeight > 0 ? 140 : 80 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {/* Large Borderless Title */}
        <TextInput
          ref={titleInputRef}
          style={styles.titleInput}
          placeholder="Title"
          placeholderTextColor="#9CA3AF"
          value={title}
          onChangeText={setTitle}
          maxLength={VAULT_LIMITS.TITLE_MAX_LEN}
          returnKeyType="next"
          onSubmitEditing={() => {
            if (!isChecklistMode) {
              bodyInputRef.current?.focus();
            } else if (checklistItems.length > 0) {
              setFocusedItemId(checklistItems[0].id);
            } else {
              handleAddCheckItem();
            }
          }}
          blurOnSubmit={false}
        />

        {/* Labels / Tags Pills Strip */}
        {(tags.length > 0 || showTagInput) && (
          <View style={styles.tagsRow}>
            {tags.map((t) => (
              <View key={t} style={styles.tagPill}>
                <Text style={styles.tagPillText}>#{t}</Text>
                <TouchableOpacity
                  onPress={() => handleRemoveTag(t)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.tagPillRemove}
                >
                  <X size={11} color="#6B7280" />
                </TouchableOpacity>
              </View>
            ))}

            {showTagInput ? (
              <View style={styles.tagInputWrapper}>
                <TextInput
                  ref={tagInputRef}
                  style={styles.tagInlineInput}
                  placeholder="label name..."
                  placeholderTextColor="#9CA3AF"
                  value={newTagText}
                  onChangeText={setNewTagText}
                  maxLength={VAULT_LIMITS.TAG_MAX_LEN}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleAddTag}
                  onBlur={() => {
                    if (newTagText.trim()) handleAddTag();
                    else setShowTagInput(false);
                  }}
                />
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowTagInput(true)}
                style={styles.addTagButton}
                activeOpacity={0.7}
              >
                <Plus size={12} color="#6B7280" />
                <Text style={styles.addTagText}>Label</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Note Body: Plain Text vs Interactive Checklist */}
        {!isChecklistMode ? (
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => bodyInputRef.current?.focus()}
            style={styles.bodyTouchableArea}
          >
            <TextInput
              ref={bodyInputRef}
              style={styles.bodyInput}
              placeholder="Note"
              placeholderTextColor="#9CA3AF"
              value={notes}
              onChangeText={setNotes}
              maxLength={VAULT_LIMITS.NOTE_MAX_LEN}
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
            />
            {notes.length >= 40000 && (
              <View style={styles.charCountBadge}>
                <Text style={styles.charCountText}>
                  {notes.length.toLocaleString()} / {VAULT_LIMITS.NOTE_MAX_LEN.toLocaleString()} characters
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.checklistContainer}>
            {/* Active Items */}
            {activeChecklist.map((item) => (
              <View key={item.id} style={styles.checklistRow}>
                <TouchableOpacity
                  onPress={() => handleToggleCheckItem(item.id)}
                  style={styles.checkboxTouchable}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Square size={19} color="#6B7280" strokeWidth={2} />
                </TouchableOpacity>
                <TextInput
                  style={styles.checkItemInput}
                  value={item.text}
                  onChangeText={(txt) => handleUpdateCheckText(item.id, txt)}
                  maxLength={VAULT_LIMITS.CHECKLIST_ITEM_MAX_LEN}
                  placeholder="List item"
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="next"
                  onSubmitEditing={handleAddCheckItem}
                  autoFocus={item.id === focusedItemId}
                  onFocus={() => setFocusedItemId(item.id)}
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  onPress={() => handleDeleteCheckItem(item.id)}
                  style={styles.checkItemDelete}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={15} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ))}

            {/* + List item row */}
            <TouchableOpacity
              onPress={handleAddCheckItem}
              style={styles.addListItemRow}
              activeOpacity={0.7}
            >
              <Plus size={18} color="#6B7280" />
              <Text style={styles.addListItemText}>List item</Text>
            </TouchableOpacity>

            {/* Completed Items Section */}
            {completedChecklist.length > 0 && (
              <View style={styles.completedSection}>
                <View style={styles.completedHeader}>
                  <Text style={styles.completedHeaderText}>
                    {completedChecklist.length} completed items
                  </Text>
                </View>
                {completedChecklist.map((item) => (
                  <View key={item.id} style={styles.checklistRow}>
                    <TouchableOpacity
                      onPress={() => handleToggleCheckItem(item.id)}
                      style={styles.checkboxTouchable}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <CheckSquare size={19} color="#9CA3AF" strokeWidth={2} />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.checkItemInput, styles.checkItemCompleted]}
                      value={item.text}
                      onChangeText={(txt) => handleUpdateCheckText(item.id, txt)}
                      returnKeyType="done"
                      blurOnSubmit={true}
                    />
                    <TouchableOpacity
                      onPress={() => handleDeleteCheckItem(item.id)}
                      style={styles.checkItemDelete}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={15} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

        {/* 4. GOOGLE KEEP BOTTOM FLOATING TOOLBAR */}
        <View
          style={[
            styles.bottomToolbar,
            {
              backgroundColor: noteColor,
              paddingBottom: keyboardHeight > 0 ? 8 : Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={styles.bottomLeftActions}>
            {/* Checklist Toggle */}
            <TouchableOpacity
              onPress={handleToggleChecklist}
              style={[
                styles.bottomActionBtn,
                isChecklistMode && styles.bottomActionBtnActive,
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
              accessibilityLabel="Toggle checklist mode"
            >
              <ListTodo
                size={20}
                color={isChecklistMode ? '#4F46E5' : '#4B5563'}
                strokeWidth={2.2}
              />
            </TouchableOpacity>

            {/* Palette Toggle */}
            <TouchableOpacity
              onPress={() => {
                HapticService.selection();
                setShowPalette(!showPalette);
              }}
              style={[
                styles.bottomActionBtn,
                showPalette && styles.bottomActionBtnActive,
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
              accessibilityLabel="Color palette"
            >
              <Palette
                size={20}
                color={showPalette ? '#4F46E5' : '#4B5563'}
                strokeWidth={2.2}
              />
            </TouchableOpacity>

            {/* Label / Tag Button */}
            <TouchableOpacity
              onPress={() => {
                HapticService.selection();
                setShowTagInput(true);
              }}
              style={styles.bottomActionBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
              accessibilityLabel="Add label"
            >
              <Tag size={19} color="#4B5563" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          {/* Right Status / Timestamp */}
          <View style={styles.bottomStatusCol}>
            <Text style={styles.bottomTimestampText}>{formatTime()}</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconButtonActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  headerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saveCheckButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  paletteContainer: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  paletteScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  colorSwatchSelected: {
    borderWidth: 2.5,
    borderColor: '#4F46E5',
    transform: [{ scale: 1.08 }],
  },
  canvasScrollView: {
    flex: 1,
  },
  canvasContent: {
    paddingTop: 10,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 20,
    paddingVertical: 8,
    letterSpacing: -0.3,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
    gap: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  tagPillRemove: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagInputWrapper: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  tagInlineInput: {
    fontSize: 12,
    color: '#111827',
    paddingVertical: 4,
    minWidth: 70,
  },
  addTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderStyle: 'dashed',
  },
  addTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  bodyTouchableArea: {
    flex: 1,
    minHeight: 400,
  },
  bodyInput: {
    fontSize: 16.5,
    lineHeight: 26,
    color: '#374151',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    minHeight: 350,
  },
  checklistContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  checkboxTouchable: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkItemInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 4,
    lineHeight: 22,
  },
  checkItemCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  checkItemDelete: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addListItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    paddingLeft: 2,
  },
  addListItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  completedSection: {
    marginTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    paddingTop: 10,
  },
  completedHeader: {
    paddingVertical: 6,
  },
  completedHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  bottomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  bottomLeftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bottomActionBtn: {
    padding: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomActionBtnActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  bottomStatusCol: {
    alignItems: 'flex-end',
  },
  bottomTimestampText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  charCountBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  charCountText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
});
