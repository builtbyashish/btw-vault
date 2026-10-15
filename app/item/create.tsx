import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  KeyRound,
  CreditCard,
  StickyNote,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Check,
  Info,
  ShieldCheck,
  X,
  Folder,
  ChevronRight,
  Calendar,
  Clock,
  Lock,
  Globe,
  Mail,
  Hash,
  AlignLeft,
  CheckSquare,
  ListFilter,
} from 'lucide-react-native';
import { useVault } from '../../src/context/VaultContext';
import { PasswordGeneratorModal } from '../../src/components/PasswordGeneratorModal';
import { DatePickerModal, formatFriendlyDate, formatFriendlyTime } from '../../src/components/DatePickerModal';
import { DropdownPickerModal, parseMultiSelectValues } from '../../src/components/DropdownPickerModal';
import { TagEditor } from '../../src/components/TagEditor';
import { CustomFieldEditor, PREDEFINED_TYPES } from '../../src/components/CustomFieldEditor';
import { ItemCategory, CustomField, CustomFieldType, CardDetails } from '../../src/types';
import { CATEGORY_THEMES, CATEGORY_ICON_MAP } from '../../src/theme/categoryColors';
import { HapticService } from '../../src/core/haptics';
import {
  detectCardNetwork,
  formatCardNumber,
  validateCardNumber,
  CardNetwork,
  CardNetworkLogo,
  CardValidationResult,
} from '../../src/card-validator';
import { LiveCardPreview } from '../../src/components/LiveCardPreview';
import { GoogleKeepNoteEditor } from '../../src/components/GoogleKeepNoteEditor';
import { useKeyboardAwareScroll } from '../../src/core/useKeyboardAwareScroll';
import { VAULT_LIMITS } from '../../src/core/security/vaultLimits';

interface CategoryMeta {
  name: string;
  createTitle: string;
  subtitle: string;
  icon: any;
}

const CATEGORY_META: Record<ItemCategory, CategoryMeta> = {
  login: {
    name: 'Login',
    createTitle: 'New Login',
    subtitle: 'Encrypted credentials, passwords & auto-clear',
    icon: KeyRound,
  },
  card: {
    name: 'Card',
    createTitle: 'New Card',
    subtitle: 'Credit & debit cards with masked digits',
    icon: CreditCard,
  },
  note: {
    name: 'Note',
    createTitle: 'New Note',
    subtitle: 'Open canvas freeform notes & thoughts',
    icon: StickyNote,
  },
  other: {
    name: 'Note',
    createTitle: 'New Note',
    subtitle: 'Open canvas freeform notes & thoughts',
    icon: StickyNote,
  },
};

export type SupportedCardType =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'rupay'
  | 'discover'
  | 'diners-club'
  | 'jcb'
  | 'maestro'
  | 'unionpay'
  | 'other';

export const CARD_TYPE_OPTIONS: { id: SupportedCardType; label: string }[] = [
  { id: 'visa', label: 'Visa' },
  { id: 'mastercard', label: 'Mastercard' },
  { id: 'amex', label: 'Amex' },
  { id: 'rupay', label: 'RuPay' },
  { id: 'discover', label: 'Discover' },
  { id: 'diners-club', label: 'Diners Club' },
  { id: 'jcb', label: 'JCB' },
  { id: 'maestro', label: 'Maestro' },
  { id: 'unionpay', label: 'UnionPay' },
  { id: 'other', label: 'Other' },
];

export default function CreateItemScreen() {
  const { addItem, isLoading, customCategories } = useVault();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();

  const customCategory = useMemo(() => {
    return customCategories.find((c) => c.id === params.type);
  }, [customCategories, params.type]);

  const category: ItemCategory = useMemo(() => {
    if (customCategory) return customCategory.id as ItemCategory;
    if (params.type && ['login', 'note', 'card', 'other'].includes(params.type)) {
      return params.type as ItemCategory;
    }
    return 'login';
  }, [customCategory, params.type]);

  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>(() => {
    if (customCategory && customCategory.fields && customCategory.fields.length > 0) {
      return customCategory.fields.map((f, idx) => ({
        id: `cf_${Date.now()}_${idx}`,
        label: f.label,
        value: f.defaultValue || '',
        type: f.type,
        options: f.options ? [...f.options] : [],
      }));
    }
    return [];
  });

  useEffect(() => {
    if (customCategory && customCategory.fields && customCategory.fields.length > 0 && customFields.length === 0) {
      setCustomFields(
        customCategory.fields.map((f, idx) => ({
          id: `cf_${Date.now()}_${idx}`,
          label: f.label,
          value: f.defaultValue || '',
          type: f.type,
          options: f.options ? [...f.options] : [],
        }))
      );
    }
  }, [customCategory]);

  // Custom Category State & Handlers
  const [showFieldRevealed, setShowFieldRevealed] = useState<Record<string, boolean>>({});
  const [activeKeyFieldForGen, setActiveKeyFieldForGen] = useState<string | null>(null);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [activePickerField, setActivePickerField] = useState<{
    id: string;
    mode: 'date' | 'time';
    title?: string;
    value?: string;
  } | null>(null);
  const [activeDropdownField, setActiveDropdownField] = useState<{
    id: string;
    title: string;
    mode: 'select' | 'multiselect';
    options: string[];
    value: string;
  } | null>(null);

  const handleSelectPickerValue = (val: string) => {
    if (activePickerField) {
      handleUpdateCustomFieldValue(activePickerField.id, val);
      setActivePickerField(null);
    }
  };

  const handleUpdateCustomFieldValue = (id: string, value: string) => {
    setCustomFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, value } : f))
    );
  };

  const handleRemoveCustomField = (id: string) => {
    HapticService.selection();
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAddNewCustomField = () => {
    const trimmed = newFieldLabel.trim();
    if (!trimmed) {
      Alert.alert('Field Label Required', 'Please enter a name for this field.');
      return;
    }
    HapticService.selection();
    const newField: CustomField = {
      id: `cf_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label: trimmed,
      type: newFieldType,
      value: '',
    };
    setCustomFields((prev) => [...prev, newField]);
    setNewFieldLabel('');
    setNewFieldType('text');
    setShowAddFieldModal(false);
  };

  // 1. Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [url, setUrl] = useState('');
  const [additionalUrls, setAdditionalUrls] = useState<string[]>([]);
  const [showGenModal, setShowGenModal] = useState(false);

  // 2. Note State
  // 3. Card State
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardNumberType, setCardNumberType] = useState<'full' | 'last4'>('last4');
  const [showCardSecurityTip, setShowCardSecurityTip] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [pin, setPin] = useState('');
  const [cardBrand, setCardBrand] = useState<SupportedCardType>('visa');
  const [showCvv, setShowCvv] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Card input refs for sequential keyboard navigation
  const cardholderInputRef = useRef<TextInput>(null);
  const cardNumberInputRef = useRef<TextInput>(null);
  const expiryInputRef = useRef<TextInput>(null);
  const cvvInputRef = useRef<TextInput>(null);
  const pinInputRef = useRef<TextInput>(null);

  // Offline card validation memo
  const cardValidation: CardValidationResult = useMemo(() => {
    if (cardNumberType === 'last4') {
      const raw = cardNumber.replace(/\D/g, '');
      return {
        isComplete: raw.length === 4,
        isValid: raw.length === 4,
        network: cardBrand as CardNetwork,
        errors: [],
        isValidFormat: raw.length === 4,
        checksumValid: true,
        possibleNetworks: [cardBrand as CardNetwork],
      };
    }
    return validateCardNumber(cardNumber);
  }, [cardNumber, cardNumberType, cardBrand]);

  const cvvMaxLen = cardBrand === 'amex' ? 4 : 3;

  // Keyboard awareness & smart auto-scrolling
  const {
    scrollViewRef,
    keyboardHeight,
    contentPaddingBottom,
    handleScrollLayout,
    handleScroll,
    registerFieldLayout,
    scrollToField,
    handleInputFocus,
  } = useKeyboardAwareScroll({
    topMargin: 20,
    bottomMargin: 24,
    defaultPaddingBottom: 40,
  });

  const onFieldLayout = (fieldName: string) => (e: any) => {
    registerFieldLayout(fieldName, e.nativeEvent.layout.y, e.nativeEvent.layout.height);
  };

  // Additional URL handlers (Login)
  const handleAddAnotherWebsite = () => {
    setAdditionalUrls([...additionalUrls, '']);
  };

  const handleUpdateAnotherWebsite = (index: number, val: string) => {
    const updated = [...additionalUrls];
    updated[index] = val;
    setAdditionalUrls(updated);
  };

  const handleRemoveAnotherWebsite = (index: number) => {
    setAdditionalUrls(additionalUrls.filter((_, i) => i !== index));
  };

  const handleCardNumberTypeChange = (type: 'full' | 'last4') => {
    if (type === cardNumberType) return;
    HapticService.selection();
    setCardNumberType(type);
    if (type === 'last4') {
      const raw = cardNumber.replace(/\D/g, '');
      if (raw.length > 4) {
        setCardNumber(raw.slice(-4));
      }
    } else {
      if (cardNumber.length > 0) {
        setCardNumber(formatCardNumber(cardNumber, cardBrand as any));
      }
    }
  };

  // Format card number with network-aware spacing and detect network
  const handleCardNumberChange = (text: string) => {
    if (cardNumberType === 'last4') {
      const cleaned = text.replace(/\D/g, '').slice(0, 4);
      setCardNumber(cleaned);
      return;
    }
    const detection = detectCardNetwork(text);
    const net = detection.network;
    const formatted = formatCardNumber(text, net);
    setCardNumber(formatted);

    const raw = text.replace(/\D/g, '');
    const knownNetworks: SupportedCardType[] = [
      'visa',
      'mastercard',
      'amex',
      'rupay',
      'discover',
      'diners-club',
      'jcb',
      'maestro',
      'unionpay',
    ];
    if (knownNetworks.includes(net as SupportedCardType)) {
      setCardBrand(net as SupportedCardType);
    } else if (raw.length > 0) {
      setCardBrand('other');
    }
  };

  // Format expiry MM/YY with smart slash handling
  const handleExpiryChange = (text: string) => {
    if (expiryDate.endsWith('/') && text === expiryDate.slice(0, -1)) {
      setExpiryDate(text.slice(0, -1));
      return;
    }
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length === 0) {
      setExpiryDate('');
      return;
    }
    if (cleaned.length === 1) {
      if (parseInt(cleaned, 10) > 1) {
        setExpiryDate(`0${cleaned}/`);
      } else {
        setExpiryDate(cleaned);
      }
      return;
    }
    const month = parseInt(cleaned.slice(0, 2), 10);
    const validMonth = month === 0 ? '01' : month > 12 ? '12' : cleaned.slice(0, 2);
    if (cleaned.length > 2) {
      setExpiryDate(`${validMonth}/${cleaned.slice(2)}`);
    } else {
      setExpiryDate(`${validMonth}/`);
    }
  };

  const handleCvvChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, cvvMaxLen);
    setCvv(cleaned);
  };

  const handlePinChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 6);
    setPin(cleaned);
  };

  const handleCardholderNameChange = (text: string) => {
    setCardholderName(text.toUpperCase());
  };

  const handleSave = async () => {
    let finalTitle = title.trim();

    if (customCategory) {
      // 1. If user defined a field specifically labeled "Title" or "Name", prefer that
      const explicitTitleField = customFields.find((f) => {
        const l = f.label.trim().toLowerCase();
        return l === 'title' || l === 'name' || l === 'item name' || l === 'account name';
      });

      if (explicitTitleField && explicitTitleField.value.trim().length > 0) {
        finalTitle = explicitTitleField.value.trim();
      } else {
        // 2. Otherwise find the first field with a non-empty value
        const firstFilledField = customFields.find((f) => f.value && f.value.trim().length > 0);
        if (firstFilledField) {
          const firstLine = firstFilledField.value.trim().split('\n')[0].trim();
          finalTitle = firstLine.slice(0, 60);
        } else if (finalTitle.length === 0) {
          if (customFields.length > 0) {
            Alert.alert('Required Field', `Please enter a value for "${customFields[0].label}".`);
            return;
          } else {
            Alert.alert('Required Field', 'Please enter a title for this item.');
            return;
          }
        }
      }
    } else {
      if (!finalTitle) {
        Alert.alert('Required Field', 'Please enter a title for this item.');
        return;
      }
    }

    const itemPayload: any = {
      title: finalTitle,
      category,
      tags: tags.length > 0 ? tags : undefined,
      notes: notes.trim() || undefined,
      customFields: customFields.length > 0 ? customFields : [],
    };

    if (category === 'login') {
      itemPayload.username = username.trim() || undefined;
      itemPayload.password = password || undefined;
      itemPayload.url = url.trim() || undefined;
      itemPayload.additionalUrls = additionalUrls.filter((u) => u.trim().length > 0);
    } else if (category === 'card') {
      itemPayload.cardDetails = {
        cardholderName: cardholderName.trim() || undefined,
        cardNumber: (cardNumberType === 'last4' ? cardNumber.replace(/\D/g, '') : cardNumber.replace(/\s+/g, '')) || undefined,
        cardNumberType,
        expiryDate: expiryDate.trim() || undefined,
        cvv: cvv.trim() || undefined,
        pin: pin.trim() || undefined,
        cardBrand,
      };
    } else if (category === 'note' || category === 'other') {
      itemPayload.notes = notes.trim() || undefined;
    }

    const success = await addItem(itemPayload);
    if (success) {
      await HapticService.success();
      router.back();
    }
  };

  const activeCategoryTheme = useMemo(() => {
    if (customCategory) {
      return {
        category: customCategory.id as ItemCategory,
        name: customCategory.name,
        color: customCategory.color,
        bgTint: customCategory.bgTint || `${customCategory.color}1A`,
        icon: CATEGORY_ICON_MAP[customCategory.icon] || Folder,
      };
    }
    return CATEGORY_THEMES[category] || CATEGORY_THEMES.login;
  }, [customCategory, category]);

  const meta = useMemo(() => {
    if (customCategory) {
      return {
        name: customCategory.name,
        createTitle: `New ${customCategory.name}`,
        subtitle: `Template with ${customCategory.fields.length} default fields`,
        icon: CATEGORY_ICON_MAP[customCategory.icon] || Folder,
      };
    }
    return CATEGORY_META[category] || CATEGORY_META.login;
  }, [customCategory, category]);

  // GOOGLE KEEP NOTE EXPERIENCE: Clean open canvas, zero form scaffolding
  if (category === 'note' || category === 'other') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <GoogleKeepNoteEditor
          mode="create"
          isLoading={isLoading}
          onSave={async (data) => {
            const itemPayload = {
              title: data.title,
              category: 'note' as ItemCategory,
              notes: data.notes,
              tags: data.tags,
              isPinned: data.isPinned,
              color: data.color,
              customFields: [],
            };
            const success = await addItem(itemPayload);
            if (success) {
              await HapticService.success();
              router.back();
            }
          }}
          onBack={() => {
            router.back();
          }}
        />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: meta.createTitle,
          headerBackTitle: 'Back',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[
                styles.headerSaveBtn,
                { backgroundColor: activeCategoryTheme.color },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save to vault"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.headerSaveBtnInner}>
                  <Check color="#FFFFFF" size={15} strokeWidth={2.6} />
                  <Text style={styles.headerSaveBtnText}>Save</Text>
                </View>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: contentPaddingBottom },
        ]}
        onLayout={handleScrollLayout}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 1. LOGIN UI */}
        {category === 'login' && (
          <View style={styles.card}>
            <View onLayout={onFieldLayout('title')}>
              <Text style={styles.label}>TITLE *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Google, Gmail, GitHub"
                placeholderTextColor="#8E8E93"
                value={title}
                onChangeText={setTitle}
                maxLength={VAULT_LIMITS.TITLE_MAX_LEN}
                onFocus={() => handleInputFocus('title')}
              />
            </View>
            <View style={styles.separator} />

            <View onLayout={onFieldLayout('username')}>
              <Text style={styles.label}>USERNAME / EMAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="username@example.com"
                placeholderTextColor="#8E8E93"
                value={username}
                onChangeText={setUsername}
                maxLength={VAULT_LIMITS.USERNAME_MAX_LEN}
                autoCapitalize="none"
                onFocus={() => handleInputFocus('username')}
              />
            </View>
            <View style={styles.separator} />

            <View onLayout={onFieldLayout('password')}>
              <View style={styles.rowLabel}>
                <Text style={styles.label}>PASSWORD</Text>
                <TouchableOpacity
                  onPress={() => setShowGenModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.genText, { color: activeCategoryTheme.color }]}>Generate</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor="#8E8E93"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  maxLength={VAULT_LIMITS.PASSWORD_MAX_LEN}
                  autoCapitalize="none"
                  onFocus={() => handleInputFocus('password')}
                />
                <TouchableOpacity
                  onPress={() => {
                    HapticService.selection();
                    setShowPassword(!showPassword);
                  }}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.6}
                >
                  {showPassword ? <EyeOff color="#8E8E93" size={18} /> : <Eye color="#8E8E93" size={18} />}
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.separator} />

            <View onLayout={onFieldLayout('url')}>
              <Text style={styles.label}>WEBSITE</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com"
                placeholderTextColor="#8E8E93"
                value={url}
                onChangeText={setUrl}
                maxLength={VAULT_LIMITS.URL_MAX_LEN}
                autoCapitalize="none"
                keyboardType="url"
                onFocus={() => handleInputFocus('url')}
              />
            </View>

            {/* Additional Websites */}
            {additionalUrls.map((anotherUrl, idx) => (
              <View
                key={idx}
                onLayout={onFieldLayout(`additionalUrl_${idx}`)}
              >
                <View style={styles.separator} />
                <View style={styles.rowLabel}>
                  <Text style={styles.label}>ADDITIONAL WEBSITE #{idx + 1}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveAnotherWebsite(idx)}
                    style={styles.deleteIconButton}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    activeOpacity={0.6}
                  >
                    <Trash2 color="#FF3B30" size={16} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="https://another-url.com"
                  placeholderTextColor="#8E8E93"
                  value={anotherUrl}
                  onChangeText={(txt) => handleUpdateAnotherWebsite(idx, txt)}
                  maxLength={VAULT_LIMITS.URL_MAX_LEN}
                  autoCapitalize="none"
                  keyboardType="url"
                  onFocus={() => handleInputFocus(`additionalUrl_${idx}`)}
                />
              </View>
            ))}

            <TouchableOpacity
              style={styles.addAnotherBtn}
              onPress={handleAddAnotherWebsite}
              activeOpacity={0.7}
            >
              <Plus color={activeCategoryTheme.color} size={13} />
              <Text style={[styles.addAnotherText, { color: activeCategoryTheme.color }]}>
                Add Another Website
              </Text>
            </TouchableOpacity>

            <View style={styles.separator} />

            <View onLayout={onFieldLayout('notes')}>
              <Text style={styles.label}>NOTES</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Add a note, recovery keys, hints..."
                placeholderTextColor="#8E8E93"
                value={notes}
                onChangeText={setNotes}
                maxLength={VAULT_LIMITS.NOTE_MAX_LEN}
                multiline
                numberOfLines={3}
                onFocus={() => handleInputFocus('notes')}
              />
            </View>

            <View style={styles.separator} />
            <View onLayout={onFieldLayout('tags')}>
              <TagEditor
                tags={tags}
                onChange={setTags}
                accentColor={activeCategoryTheme.color}
                onInputFocus={() => handleInputFocus('tags')}
              />
            </View>

            <View style={styles.separator} />
            <View onLayout={onFieldLayout('customFields')}>
              <CustomFieldEditor
                fields={customFields}
                onChange={setCustomFields}
                accentColor={activeCategoryTheme.color}
                onInputFocus={() => handleInputFocus('customFields')}
              />
            </View>
          </View>
        )}



        {/* 3. CC / DEBIT CARD UI */}
        {category === 'card' && (
          <>
            {/* Live Interactive Card Preview */}
            <LiveCardPreview
              title={title}
              cardNumber={cardNumber}
              cardNumberType={cardNumberType}
              cardholderName={cardholderName}
              expiryDate={expiryDate}
              network={cardBrand}
            />

            <View style={styles.card}>
              {/* TITLE */}
              <View onLayout={onFieldLayout('title')}>
                <Text style={styles.label}>TITLE *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Chase Sapphire, Apple Card, HDFC Regalia"
                  placeholderTextColor="#8E8E93"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={VAULT_LIMITS.TITLE_MAX_LEN}
                  returnKeyType="next"
                  onSubmitEditing={() => cardholderInputRef.current?.focus()}
                  onFocus={() => handleInputFocus('title')}
                />
              </View>
              <View style={styles.separator} />

              {/* CARDHOLDER NAME */}
              <View onLayout={onFieldLayout('cardholderName')}>
                <Text style={styles.label}>CARDHOLDER NAME</Text>
                <TextInput
                  ref={cardholderInputRef}
                  style={styles.input}
                  placeholder="NAME ON CARD"
                  placeholderTextColor="#8E8E93"
                  value={cardholderName}
                  onChangeText={handleCardholderNameChange}
                  maxLength={VAULT_LIMITS.CARDHOLDER_MAX_LEN}
                  autoCapitalize="characters"
                  returnKeyType="next"
                  onSubmitEditing={() => cardNumberInputRef.current?.focus()}
                  onFocus={() => handleInputFocus('cardholderName')}
                />
              </View>
              <View style={styles.separator} />

              {/* CARD NUMBER */}
              <View onLayout={onFieldLayout('cardNumber')}>
                <View style={styles.rowLabel}>
                  <View style={styles.labelWithInfo}>
                    <Text style={styles.label}>CARD NUMBER</Text>
                    <TouchableOpacity
                      onPress={() => {
                        HapticService.selection();
                        setShowCardSecurityTip(!showCardSecurityTip);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      activeOpacity={0.7}
                      style={[styles.infoIconBtn, showCardSecurityTip && styles.infoIconBtnActive]}
                      accessibilityLabel="Security options info"
                    >
                      <Info size={14} color={showCardSecurityTip ? '#007AFF' : '#8E8E93'} strokeWidth={2.2} />
                    </TouchableOpacity>
                  </View>

                  {cardNumberType === 'last4' ? (
                    cardNumber.length === 4 ? (
                      <View style={[styles.validationPill, styles.validationPillSuccess]}>
                        <Text style={[styles.validationPillText, styles.validationPillTextSuccess]}>
                          ✓ 4 Digits Stored
                        </Text>
                      </View>
                    ) : cardNumber.length > 0 ? (
                      <View style={[styles.validationPill, styles.validationPillNeutral]}>
                        <Text style={[styles.validationPillText, styles.validationPillTextNeutral]}>
                          {4 - cardNumber.length} left
                        </Text>
                      </View>
                    ) : null
                  ) : (
                    cardValidation.isComplete && (
                      <View
                        style={[
                          styles.validationPill,
                          cardValidation.isValid ? styles.validationPillSuccess : styles.validationPillError,
                        ]}
                      >
                        <Text
                          style={[
                            styles.validationPillText,
                            cardValidation.isValid ? styles.validationPillTextSuccess : styles.validationPillTextError,
                          ]}
                        >
                          {cardValidation.isValid ? '✓ Valid' : 'Check Digit Error'}
                        </Text>
                      </View>
                    )
                  )}
                </View>

                {/* SEGMENTED CONTROL: Last 4 Digits (first) vs Full Card */}
                <View style={styles.cardModeSegment}>
                  <TouchableOpacity
                    style={[
                      styles.segmentBtn,
                      cardNumberType === 'last4' && styles.segmentBtnActive,
                    ]}
                    onPress={() => handleCardNumberTypeChange('last4')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.segmentWithBadge}>
                      <Text
                        style={[
                          styles.segmentBtnText,
                          cardNumberType === 'last4' && styles.segmentBtnTextActive,
                        ]}
                      >
                        Last 4 Digits
                      </Text>
                      <View style={styles.securityMiniBadge}>
                        <Text style={styles.securityMiniBadgeText}>Safe</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.segmentBtn,
                      cardNumberType === 'full' && styles.segmentBtnActive,
                    ]}
                    onPress={() => handleCardNumberTypeChange('full')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        cardNumberType === 'full' && styles.segmentBtnTextActive,
                      ]}
                    >
                      Full Card Number
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* TOOLTIP BANNER */}
                {showCardSecurityTip && (
                  <View style={styles.securityTipCard}>
                    <View style={styles.securityTipHeader}>
                      <View style={styles.securityTipTitleRow}>
                        <ShieldCheck size={15} color="#007AFF" strokeWidth={2.4} />
                        <Text style={styles.securityTipTitle}>Security & Privacy Choice</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setShowCardSecurityTip(false)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <X size={14} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.securityTipBody}>
                      Prefer not to store full card numbers on your device? Switch to <Text style={{ fontWeight: '600', color: '#1C1C1E' }}>Last 4 Digits</Text> to keep just enough info to recognize your card (•••• 4242) without storing complete payment digits.
                    </Text>
                  </View>
                )}

                <View style={styles.cardNumberInputRow}>
                  {cardNumberType === 'last4' && (
                    <Text style={styles.last4PrefixText}>••••  ••••  •••• </Text>
                  )}
                  <TextInput
                    ref={cardNumberInputRef}
                    style={[
                      styles.input,
                      styles.monoInput,
                      { flex: 1 },
                      cardNumberType === 'last4' && styles.last4Input,
                    ]}
                    placeholder={cardNumberType === 'last4' ? '4242' : '•••• •••• •••• ••••'}
                    placeholderTextColor="#8E8E93"
                    value={cardNumber}
                    onChangeText={handleCardNumberChange}
                    keyboardType="number-pad"
                    maxLength={cardNumberType === 'last4' ? 4 : (cardBrand === 'amex' ? 17 : 23)}
                    returnKeyType="next"
                    onSubmitEditing={() => expiryInputRef.current?.focus()}
                    onFocus={() => handleInputFocus('cardNumber')}
                  />
                  <View style={styles.cardNumberBadgeContainer}>
                    <CardNetworkLogo network={cardBrand} size={22} />
                  </View>
                </View>
                {cardNumberType === 'full' && cardValidation.isComplete && !cardValidation.isValid && cardValidation.errors.includes('INVALID_CHECKSUM') && (
                  <Text style={styles.fieldErrorText}>Card number failed Luhn checksum validation</Text>
                )}
              </View>
              <View style={styles.separator} />

              {/* EXPIRY & CVV ROW */}
              <View
                style={styles.twoColumnRow}
                onLayout={onFieldLayout('expiryDate')}
              >
                <View style={styles.halfCol}>
                  <Text style={styles.label}>EXPIRY (MM/YY)</Text>
                  <TextInput
                    ref={expiryInputRef}
                    style={[styles.input, styles.monoInput]}
                    placeholder="MM/YY"
                    placeholderTextColor="#8E8E93"
                    value={expiryDate}
                    onChangeText={handleExpiryChange}
                    keyboardType="number-pad"
                    maxLength={5}
                    returnKeyType="next"
                    onSubmitEditing={() => cvvInputRef.current?.focus()}
                    onFocus={() => handleInputFocus('expiryDate')}
                  />
                </View>

                <View style={styles.halfCol}>
                  <Text style={styles.label}>
                    CVV / CVC {cardBrand === 'amex' ? '(4-DIGIT)' : '(3-DIGIT)'}
                  </Text>
                  <View style={styles.secureInputRow}>
                    <TextInput
                      ref={cvvInputRef}
                      style={[styles.input, styles.monoInput, { flex: 1 }]}
                      placeholder={cardBrand === 'amex' ? 'CID' : 'CVV'}
                      placeholderTextColor="#8E8E93"
                      value={cvv}
                      onChangeText={handleCvvChange}
                      keyboardType="number-pad"
                      maxLength={cvvMaxLen}
                      secureTextEntry={!showCvv}
                      returnKeyType="next"
                      onSubmitEditing={() => pinInputRef.current?.focus()}
                      onFocus={() => handleInputFocus('expiryDate')}
                    />
                    <TouchableOpacity
                      onPress={() => setShowCvv(!showCvv)}
                      style={styles.inlineEyeBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {showCvv ? <EyeOff color="#8E8E93" size={16} /> : <Eye color="#8E8E93" size={16} />}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View style={styles.separator} />

              {/* ATM PIN (OPTIONAL) */}
              <View onLayout={onFieldLayout('pin')}>
                <Text style={styles.label}>ATM PIN (OPTIONAL)</Text>
                <View style={styles.secureInputRow}>
                  <TextInput
                    ref={pinInputRef}
                    style={[styles.input, styles.monoInput, { flex: 1 }]}
                    placeholder="PIN"
                    placeholderTextColor="#8E8E93"
                    value={pin}
                    onChangeText={handlePinChange}
                    keyboardType="number-pad"
                    maxLength={6}
                    secureTextEntry={!showPin}
                    onFocus={() => handleInputFocus('pin')}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPin(!showPin)}
                    style={styles.inlineEyeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {showPin ? <EyeOff color="#8E8E93" size={16} /> : <Eye color="#8E8E93" size={16} />}
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.separator} />

              {/* CARD TYPE SELECTOR */}
              <View onLayout={onFieldLayout('cardBrand')}>
                <Text style={styles.label}>CARD TYPE</Text>
                <View style={styles.cardTypeGrid}>
                  {CARD_TYPE_OPTIONS.map((item) => {
                    const isSelected = cardBrand === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.cardTypeCard,
                          isSelected && styles.cardTypeCardSelected,
                        ]}
                        onPress={() => {
                          HapticService.selection();
                          setCardBrand(item.id);
                          if (cardNumber) {
                            setCardNumber(formatCardNumber(cardNumber, item.id as any));
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.cardTypeIconWrap}>
                          <CardNetworkLogo network={item.id} size={20} />
                        </View>
                        <Text
                          style={[
                            styles.cardTypeLabel,
                            isSelected && styles.cardTypeLabelSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={styles.separator} />

            <View onLayout={onFieldLayout('notes')}>
              <Text style={styles.label}>NOTES</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Bank phone, billing address..."
                placeholderTextColor="#8E8E93"
                value={notes}
                onChangeText={setNotes}
                maxLength={VAULT_LIMITS.NOTE_MAX_LEN}
                multiline
                numberOfLines={3}
                onFocus={() => handleInputFocus('notes')}
              />
            </View>

            <View style={styles.separator} />
            <View onLayout={onFieldLayout('tags')}>
              <TagEditor
                tags={tags}
                onChange={setTags}
                accentColor={activeCategoryTheme.color}
                onInputFocus={() => handleInputFocus('tags')}
              />
            </View>

            <View style={styles.separator} />
            <View onLayout={onFieldLayout('customFields')}>
              <CustomFieldEditor
                fields={customFields}
                onChange={setCustomFields}
                accentColor={activeCategoryTheme.color}
                onInputFocus={() => handleInputFocus('customFields')}
              />
            </View>
          </View>
        </>
      )}

      {/* 3. CUSTOM CATEGORY UI (Native, first-class form fields matching Login & Card) */}
      {category !== 'login' && category !== 'card' && (
        <View style={styles.card}>
          {/* If the category has NO fields configured, provide Title input */}
          {customFields.length === 0 && (
            <View onLayout={onFieldLayout('title')}>
              <Text style={styles.label}>TITLE *</Text>
              <TextInput
                style={styles.input}
                placeholder={`e.g. My ${customCategory ? customCategory.name : 'Item'}`}
                placeholderTextColor="#8E8E93"
                value={title}
                onChangeText={setTitle}
                maxLength={VAULT_LIMITS.TITLE_MAX_LEN}
                onFocus={() => handleInputFocus('title')}
              />
            </View>
          )}

          {/* Render each field as a native form field */}
          {customFields.map((field, idx) => {
            const isSecret = field.type === 'key' || field.type === 'hidden';
            const isRevealed = showFieldRevealed[field.id];

            return (
              <React.Fragment key={field.id}>
                {(idx > 0 || customFields.length === 0) && <View style={styles.separator} />}

                <View onLayout={onFieldLayout(`field_${field.id}`)}>
                  <View style={styles.rowLabel}>
                    <Text style={styles.label}>{(field.label || 'FIELD').toUpperCase()}</Text>
                    <View style={styles.labelActionsRow}>
                      {isSecret && (
                        <TouchableOpacity
                          onPress={() => {
                            setActiveKeyFieldForGen(field.id);
                            setShowGenModal(true);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.genText, { color: activeCategoryTheme.color }]}>Generate</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => handleRemoveCustomField(field.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.6}
                        style={{ marginLeft: 8 }}
                      >
                        <Trash2 color="#C7C7CC" size={15} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {field.type === 'textarea' ? (
                    <View style={styles.textareaWrapper}>
                      <TextInput
                        style={styles.textareaInput}
                        placeholder={field.label ? `Enter ${field.label}...` : 'Enter multiline text, notes, backup codes...'}
                        placeholderTextColor="#8E8E93"
                        value={field.value}
                        onChangeText={(txt) => handleUpdateCustomFieldValue(field.id, txt)}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        onFocus={() => handleInputFocus(`field_${field.id}`)}
                      />
                      <View style={styles.textareaFooter}>
                        <Text style={styles.textareaCounter}>
                          {field.value
                            ? `${field.value.split('\n').length} line${field.value.split('\n').length === 1 ? '' : 's'} · ${field.value.length} char${field.value.length === 1 ? '' : 's'}`
                            : 'Multiline text area'}
                        </Text>
                      </View>
                    </View>
                  ) : field.type === 'date' ? (
                    <TouchableOpacity
                      style={styles.pickerFieldButton}
                      onPress={() => {
                        HapticService.selection();
                        setActivePickerField({ id: field.id, mode: 'date', title: field.label, value: field.value });
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.pickerFieldIconBox, { backgroundColor: '#007AFF15' }]}>
                        <Calendar color="#007AFF" size={16} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerFieldValueText, !field.value && styles.pickerFieldPlaceholder]}>
                          {field.value ? formatFriendlyDate(field.value) : (field.label ? `Select ${field.label}` : 'Select date')}
                        </Text>
                        {field.value ? (
                          <Text style={styles.pickerFieldSubText}>{field.value}</Text>
                        ) : null}
                      </View>
                      <View style={styles.pickerFieldChevronBox}>
                        <ChevronRight color="#C7C7CC" size={16} />
                      </View>
                    </TouchableOpacity>
                  ) : field.type === 'time' ? (
                    <TouchableOpacity
                      style={styles.pickerFieldButton}
                      onPress={() => {
                        HapticService.selection();
                        setActivePickerField({ id: field.id, mode: 'time', title: field.label, value: field.value });
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.pickerFieldIconBox, { backgroundColor: '#FF2D5515' }]}>
                        <Clock color="#FF2D55" size={16} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerFieldValueText, !field.value && styles.pickerFieldPlaceholder]}>
                          {field.value ? formatFriendlyTime(field.value) : (field.label ? `Select ${field.label}` : 'Select time')}
                        </Text>
                        {field.value ? (
                          <Text style={styles.pickerFieldSubText}>{field.value}</Text>
                        ) : null}
                      </View>
                      <View style={styles.pickerFieldChevronBox}>
                        <ChevronRight color="#C7C7CC" size={16} />
                      </View>
                    </TouchableOpacity>
                  ) : field.type === 'select' ? (
                    <TouchableOpacity
                      style={styles.pickerFieldButton}
                      onPress={() => {
                        HapticService.selection();
                        setActiveDropdownField({
                          id: field.id,
                          title: field.label || 'Select option',
                          mode: 'select',
                          options: field.options || [],
                          value: field.value || '',
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.pickerFieldIconBox, { backgroundColor: '#007AFF15' }]}>
                        <CheckSquare color="#007AFF" size={16} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerFieldValueText, !field.value && styles.pickerFieldPlaceholder]}>
                          {field.value || (field.label ? `Select ${field.label}` : 'Select option')}
                        </Text>
                        {field.options && field.options.length > 0 ? (
                          <Text style={styles.pickerFieldSubText}>
                            {field.options.length} {field.options.length === 1 ? 'option available' : 'options available'}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.pickerFieldChevronBox}>
                        <ChevronRight color="#C7C7CC" size={16} />
                      </View>
                    </TouchableOpacity>
                  ) : field.type === 'multiselect' ? (
                    <TouchableOpacity
                      style={styles.pickerFieldButton}
                      onPress={() => {
                        HapticService.selection();
                        setActiveDropdownField({
                          id: field.id,
                          title: field.label || 'Select options',
                          mode: 'multiselect',
                          options: field.options || [],
                          value: field.value || '',
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.pickerFieldIconBox, { backgroundColor: '#0284C715' }]}>
                        <ListFilter color="#0284C7" size={16} />
                      </View>
                      <View style={{ flex: 1 }}>
                        {field.value ? (
                          <View style={styles.multiSelectChipsWrap}>
                            {parseMultiSelectValues(field.value).map((item, idx) => (
                              <View key={`${item}-${idx}`} style={styles.multiSelectChip}>
                                <Text style={styles.multiSelectChipText} numberOfLines={1}>{item}</Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text style={[styles.pickerFieldValueText, styles.pickerFieldPlaceholder]}>
                            {field.label ? `Select ${field.label}...` : 'Select options...'}
                          </Text>
                        )}
                        {field.options && field.options.length > 0 ? (
                          <Text style={styles.pickerFieldSubText}>
                            {field.options.length} {field.options.length === 1 ? 'option available' : 'options available'}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.pickerFieldChevronBox}>
                        <ChevronRight color="#C7C7CC" size={16} />
                      </View>
                    </TouchableOpacity>
                  ) : field.type === 'key' ? (
                    <View style={styles.fieldWithIconContainer}>
                      <View style={[styles.inputPrefixIconBox, { backgroundColor: '#8B5CF618' }]}>
                        <KeyRound color="#8B5CF6" size={15} />
                      </View>
                      <TextInput
                        style={[styles.inputWithPrefix, styles.monoInput]}
                        placeholder={field.label ? `Enter ${field.label}` : 'Enter secret key or token'}
                        placeholderTextColor="#8E8E93"
                        secureTextEntry={!isRevealed}
                        value={field.value}
                        onChangeText={(txt) => handleUpdateCustomFieldValue(field.id, txt)}
                        autoCapitalize="none"
                        autoCorrect={false}
                        onFocus={() => handleInputFocus(`field_${field.id}`)}
                      />
                      <TouchableOpacity
                        onPress={() => {
                          HapticService.selection();
                          setShowFieldRevealed((prev) => ({
                            ...prev,
                            [field.id]: !prev[field.id],
                          }));
                        }}
                        style={styles.eyeBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.6}
                      >
                        {isRevealed ? (
                          <EyeOff color="#8E8E93" size={18} />
                        ) : (
                          <Eye color="#8E8E93" size={18} />
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : field.type === 'hidden' ? (
                    <View style={styles.fieldWithIconContainer}>
                      <View style={[styles.inputPrefixIconBox, { backgroundColor: '#FF3B3018' }]}>
                        <Lock color="#FF3B30" size={15} />
                      </View>
                      <TextInput
                        style={[styles.inputWithPrefix, styles.monoInput]}
                        placeholder={field.label ? `Enter ${field.label}` : 'Enter secret'}
                        placeholderTextColor="#8E8E93"
                        secureTextEntry={!isRevealed}
                        value={field.value}
                        onChangeText={(txt) => handleUpdateCustomFieldValue(field.id, txt)}
                        autoCapitalize="none"
                        autoCorrect={false}
                        onFocus={() => handleInputFocus(`field_${field.id}`)}
                      />
                      <TouchableOpacity
                        onPress={() => {
                          HapticService.selection();
                          setShowFieldRevealed((prev) => ({
                            ...prev,
                            [field.id]: !prev[field.id],
                          }));
                        }}
                        style={styles.eyeBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.6}
                      >
                        {isRevealed ? (
                          <EyeOff color="#8E8E93" size={18} />
                        ) : (
                          <Eye color="#8E8E93" size={18} />
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : field.type === 'payment' ? (
                    <View style={styles.fieldWithIconContainer}>
                      <View style={[styles.inputPrefixIconBox, { backgroundColor: '#EC489918' }]}>
                        <CreditCard color="#EC4899" size={15} />
                      </View>
                      <TextInput
                        style={[styles.inputWithPrefix, styles.monoInput]}
                        placeholder={field.label ? `Enter ${field.label}` : 'IBAN, Routing, Account or Card #'}
                        placeholderTextColor="#8E8E93"
                        value={field.value}
                        onChangeText={(txt) => handleUpdateCustomFieldValue(field.id, txt)}
                        autoCapitalize="characters"
                        onFocus={() => handleInputFocus(`field_${field.id}`)}
                      />
                    </View>
                  ) : field.type === 'email' ? (
                    <View style={styles.fieldWithIconContainer}>
                      <View style={[styles.inputPrefixIconBox, { backgroundColor: '#007AFF18' }]}>
                        <Mail color="#007AFF" size={15} />
                      </View>
                      <TextInput
                        style={styles.inputWithPrefix}
                        placeholder={field.label ? `Enter ${field.label}` : 'name@example.com'}
                        placeholderTextColor="#8E8E93"
                        value={field.value}
                        onChangeText={(txt) => handleUpdateCustomFieldValue(field.id, txt)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        onFocus={() => handleInputFocus(`field_${field.id}`)}
                      />
                    </View>
                  ) : field.type === 'url' || field.type === 'link' ? (
                    <View style={styles.fieldWithIconContainer}>
                      <View style={[styles.inputPrefixIconBox, { backgroundColor: '#34C75918' }]}>
                        <Globe color="#34C759" size={15} />
                      </View>
                      <TextInput
                        style={styles.inputWithPrefix}
                        placeholder={field.label ? `Enter ${field.label}` : 'https://example.com'}
                        placeholderTextColor="#8E8E93"
                        value={field.value}
                        onChangeText={(txt) => handleUpdateCustomFieldValue(field.id, txt)}
                        keyboardType="url"
                        autoCapitalize="none"
                        onFocus={() => handleInputFocus(`field_${field.id}`)}
                      />
                    </View>
                  ) : field.type === 'number' ? (
                    <View style={styles.fieldWithIconContainer}>
                      <View style={[styles.inputPrefixIconBox, { backgroundColor: '#FF950018' }]}>
                        <Hash color="#FF9500" size={15} />
                      </View>
                      <TextInput
                        style={styles.inputWithPrefix}
                        placeholder={field.label ? `Enter ${field.label}` : '0'}
                        placeholderTextColor="#8E8E93"
                        value={field.value}
                        onChangeText={(txt) => handleUpdateCustomFieldValue(field.id, txt)}
                        keyboardType="numeric"
                        onFocus={() => handleInputFocus(`field_${field.id}`)}
                      />
                    </View>
                  ) : (
                    <TextInput
                      style={styles.input}
                      placeholder={field.label ? `Enter ${field.label}` : 'Enter value'}
                      placeholderTextColor="#8E8E93"
                      value={field.value}
                      onChangeText={(txt) => handleUpdateCustomFieldValue(field.id, txt)}
                      onFocus={() => handleInputFocus(`field_${field.id}`)}
                    />
                  )}
                </View>
              </React.Fragment>
            );
          })}

          {/* Add Another Field Button (native form style matching Add Another Website) */}
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.addAnotherBtn}
            onPress={() => {
              HapticService.selection();
              setShowAddFieldModal(true);
            }}
            activeOpacity={0.7}
          >
            <Plus color={activeCategoryTheme.color} size={13} />
            <Text style={[styles.addAnotherText, { color: activeCategoryTheme.color }]}>
              Add Another Field
            </Text>
          </TouchableOpacity>
        </View>
      )}
      </ScrollView>

      <PasswordGeneratorModal
        visible={showGenModal}
        onClose={() => {
          setShowGenModal(false);
          setActiveKeyFieldForGen(null);
        }}
        onUsePassword={(p) => {
          if (activeKeyFieldForGen) {
            handleUpdateCustomFieldValue(activeKeyFieldForGen, p);
            setShowFieldRevealed((prev) => ({ ...prev, [activeKeyFieldForGen]: true }));
            setActiveKeyFieldForGen(null);
          } else {
            setPassword(p);
            setShowPassword(true);
          }
        }}
      />

      {/* Date & Time Picker Modal */}
      <DatePickerModal
        visible={activePickerField !== null}
        onClose={() => setActivePickerField(null)}
        onSelect={handleSelectPickerValue}
        initialValue={activePickerField?.value || ''}
        mode={activePickerField?.mode || 'date'}
        title={activePickerField?.title ? `Select ${activePickerField.title}` : undefined}
        accentColor={activeCategoryTheme.color}
      />

      {/* Dropdown / Multi-Select Picker Modal */}
      <DropdownPickerModal
        visible={activeDropdownField !== null}
        onClose={() => setActiveDropdownField(null)}
        onSelect={(val) => {
          if (activeDropdownField) {
            handleUpdateCustomFieldValue(activeDropdownField.id, val);
            setActiveDropdownField(null);
          }
        }}
        initialValue={activeDropdownField?.value || ''}
        options={activeDropdownField?.options || []}
        mode={activeDropdownField?.mode || 'select'}
        title={activeDropdownField?.title}
        accentColor={activeCategoryTheme.color}
      />

      {/* Modal to add an extra field on the fly */}
      <Modal
        visible={showAddFieldModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddFieldModal(false)}
      >
        <TouchableOpacity
          style={styles.addFieldModalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddFieldModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', justifyContent: 'flex-end' }}
          >
            <View style={styles.addFieldModalSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.addFieldModalHeader}>
                <Text style={styles.addFieldModalTitle}>Add Field</Text>
                <TouchableOpacity
                  onPress={() => setShowAddFieldModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X color="#8E8E93" size={18} />
                </TouchableOpacity>
              </View>

              <Text style={styles.addFieldModalLabel}>FIELD LABEL</Text>
              <TextInput
                style={styles.addFieldModalInput}
                placeholder="e.g. Account Number, PIN, Recovery Email"
                placeholderTextColor="#8E8E93"
                value={newFieldLabel}
                onChangeText={setNewFieldLabel}
                autoFocus
              />

              <Text style={styles.addFieldModalLabel}>FIELD TYPE</Text>
              <View style={styles.fieldTypeChipsGrid}>
                {PREDEFINED_TYPES.map((t) => {
                  const isSelected = newFieldType === t.type;
                  const IconComp = t.icon;
                  return (
                    <TouchableOpacity
                      key={t.type}
                      style={[
                        styles.fieldTypeChip,
                        isSelected && { backgroundColor: `${t.color}20`, borderColor: t.color },
                      ]}
                      onPress={() => {
                        HapticService.selection();
                        setNewFieldType(t.type);
                      }}
                      activeOpacity={0.7}
                    >
                      <IconComp color={isSelected ? t.color : '#8E8E93'} size={14} style={{ marginRight: 6 }} />
                      <Text
                        style={[
                          styles.fieldTypeChipText,
                          isSelected && { color: t.color, fontWeight: '700' },
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.addFieldConfirmBtn, { backgroundColor: activeCategoryTheme.color }]}
                onPress={handleAddNewCustomField}
                activeOpacity={0.8}
              >
                <Plus color="#FFFFFF" size={16} style={{ marginRight: 6 }} />
                <Text style={styles.addFieldConfirmBtnText}>Add Field to Form</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  googleNoteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  googleNoteTitleInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    paddingVertical: 6,
    marginBottom: 8,
  },
  googleNoteBodyInput: {
    fontSize: 16,
    color: '#2C2C2E',
    lineHeight: 24,
    minHeight: 180,
    paddingVertical: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  rowLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  genText: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    fontSize: 16,
    color: '#000000',
    paddingVertical: 8,
  },
  monoInput: {
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 8,
  },
  eyeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  addAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  addAnotherText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 16,
  },
  halfCol: {
    flex: 1,
  },
  labelWithInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoIconBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  infoIconBtnActive: {
    backgroundColor: '#E1EFFF',
  },
  cardModeSegment: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
    marginTop: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.1,
    shadowRadius: 2.5,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  segmentBtnTextActive: {
    color: '#1C1C1E',
    fontWeight: '700',
  },
  segmentWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  securityMiniBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.16)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  securityMiniBadgeText: {
    color: '#34C759',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  securityTipCard: {
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: '#C7E2FE',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  securityTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  securityTipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityTipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
  },
  securityTipBody: {
    fontSize: 12,
    lineHeight: 17,
    color: '#3C3C43',
  },
  last4PrefixText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#8E8E93',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginRight: 4,
  },
  last4Input: {
    letterSpacing: 2,
  },
  cardNumberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardNumberBadgeContainer: {
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  validationPillSuccess: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
  },
  validationPillError: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
  },
  validationPillNeutral: {
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
  },
  validationPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  validationPillTextSuccess: {
    color: '#34C759',
  },
  validationPillTextError: {
    color: '#FF3B30',
  },
  validationPillTextNeutral: {
    color: '#8E8E93',
  },
  fieldErrorText: {
    fontSize: 11,
    color: '#FF3B30',
    marginTop: 4,
    fontWeight: '500',
  },
  secureInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineEyeBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  cardTypeCard: {
    width: '31.3%',
    minHeight: 58,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cardTypeCardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTypeIconWrap: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTypeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: -0.1,
  },
  cardTypeLabelSelected: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  selectedBrandPillText: {
    color: '#FFFFFF',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginVertical: 12,
  },
  headerSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 68,
    minHeight: 34,
  },
  headerSaveBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  labelActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addFieldModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  addFieldModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  addFieldModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addFieldModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  addFieldModalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  addFieldModalInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000000',
    marginBottom: 16,
  },
  fieldTypeChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  fieldTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  fieldTypeChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  addFieldConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
  },
  addFieldConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  textareaWrapper: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    marginTop: 4,
  },
  textareaInput: {
    fontSize: 14,
    color: '#000000',
    minHeight: 88,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  textareaFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
    marginTop: 6,
  },
  textareaCounter: {
    fontSize: 11,
    color: '#8E8E93',
  },
  pickerFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  pickerFieldIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pickerFieldValueText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  pickerFieldPlaceholder: {
    color: '#8E8E93',
    fontWeight: '400',
  },
  pickerFieldSubText: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  pickerFieldChevronBox: {
    marginLeft: 8,
  },
  fieldWithIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    marginTop: 4,
  },
  inputPrefixIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  inputWithPrefix: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
    paddingVertical: 10,
  },
  multiSelectChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 2,
  },
  multiSelectChip: {
    backgroundColor: '#0284C715',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0284C730',
  },
  multiSelectChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
  },
});
