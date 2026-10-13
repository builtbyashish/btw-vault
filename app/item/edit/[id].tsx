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
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  KeyRound,
  CreditCard,
  StickyNote,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Check,
} from 'lucide-react-native';
import { useVault } from '../../../src/context/VaultContext';
import { PasswordGeneratorModal } from '../../../src/components/PasswordGeneratorModal';
import { TagEditor } from '../../../src/components/TagEditor';
import { CustomFieldEditor } from '../../../src/components/CustomFieldEditor';
import { ItemCategory, CustomField, CardDetails, VaultItem } from '../../../src/types';
import { CATEGORY_THEMES } from '../../../src/theme/categoryColors';
import { HapticService } from '../../../src/core/haptics';
import { useSensitiveAuth } from '../../../src/components/SensitiveAuthModal';
import {
  detectCardNetwork,
  formatCardNumber,
  validateCardNumber,
  CardNetwork,
  CardNetworkLogo,
} from '../../../src/card-validator';
import { LiveCardPreview } from '../../../src/components/LiveCardPreview';
import { GoogleKeepNoteEditor } from '../../../src/components/GoogleKeepNoteEditor';

interface CategoryMeta {
  name: string;
  editTitle: string;
  subtitle: string;
  icon: any;
}

const CATEGORY_META: Record<ItemCategory, CategoryMeta> = {
  login: {
    name: 'Login',
    editTitle: 'Edit Login',
    subtitle: 'Encrypted credentials, passwords & auto-clear',
    icon: KeyRound,
  },
  card: {
    name: 'Card',
    editTitle: 'Edit Card',
    subtitle: 'Credit & debit cards with masked digits',
    icon: CreditCard,
  },
  note: {
    name: 'Note',
    editTitle: 'Edit Note',
    subtitle: 'Open canvas freeform notes & thoughts',
    icon: StickyNote,
  },
  other: {
    name: 'Note',
    editTitle: 'Edit Note',
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

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, updateItem, deleteItem, isLoading } = useVault();
  const router = useRouter();

  const existingItem = items.find((i) => i.id === id);

  if (!existingItem) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Vault item not found</Text>
      </View>
    );
  }

  // Common State
  const [title, setTitle] = useState(existingItem.title || '');
  const category: ItemCategory = existingItem.category || 'login';
  const [tags, setTags] = useState<string[]>(existingItem.tags || []);
  const [notes, setNotes] = useState(existingItem.notes || '');
  const [customFields, setCustomFields] = useState<CustomField[]>(existingItem.customFields || []);

  // 1. Login State
  const [username, setUsername] = useState(existingItem.username || '');
  const [password, setPassword] = useState(existingItem.password || '');
  const { requireAuth, AuthModal } = useSensitiveAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [url, setUrl] = useState(existingItem.url || '');
  const [additionalUrls, setAdditionalUrls] = useState<string[]>(existingItem.additionalUrls || []);
  const [showGenModal, setShowGenModal] = useState(false);

  const handleTogglePassword = async () => {
    if (showPassword) {
      HapticService.selection();
      setShowPassword(false);
      return;
    }
    const ok = await requireAuth('Authenticate to reveal password');
    if (ok) {
      setShowPassword(true);
    }
  };

  // 3. Card State
  const initialRawCard = existingItem.cardDetails?.cardNumber || '';
  const rawBrand = (existingItem.cardDetails?.cardBrand || '').toLowerCase();
  const detectedNet = initialRawCard ? detectCardNetwork(initialRawCard).network : '';
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
  const initialBrand: SupportedCardType = knownNetworks.includes(rawBrand as SupportedCardType)
    ? (rawBrand as SupportedCardType)
    : knownNetworks.includes(detectedNet as SupportedCardType)
    ? (detectedNet as SupportedCardType)
    : 'other';

  const [cardholderName, setCardholderName] = useState(existingItem.cardDetails?.cardholderName || '');
  const [cardNumber, setCardNumber] = useState(
    initialRawCard ? formatCardNumber(initialRawCard, initialBrand as any) : ''
  );
  const [expiryDate, setExpiryDate] = useState(existingItem.cardDetails?.expiryDate || '');
  const [cvv, setCvv] = useState(existingItem.cardDetails?.cvv || '');
  const [pin, setPin] = useState(existingItem.cardDetails?.pin || '');
  const [cardBrand, setCardBrand] = useState<SupportedCardType>(initialBrand);
  const [showCvv, setShowCvv] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Card input refs for sequential keyboard navigation
  const cardholderInputRef = useRef<TextInput>(null);
  const cardNumberInputRef = useRef<TextInput>(null);
  const expiryInputRef = useRef<TextInput>(null);
  const cvvInputRef = useRef<TextInput>(null);
  const pinInputRef = useRef<TextInput>(null);

  // Offline card validation memo
  const cardValidation = useMemo(() => {
    return validateCardNumber(cardNumber);
  }, [cardNumber]);

  const cvvMaxLen = cardBrand === 'amex' ? 4 : 3;

  // Keyboard awareness & auto-scrolling
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const fieldOffsets = useRef<Record<string, number>>({});
  const activeFieldRef = useRef<string | null>(null);

  const scrollToField = (fieldName: string) => {
    setTimeout(() => {
      const y = fieldOffsets.current[fieldName];
      if (typeof y === 'number' && y > 0) {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, y - 30),
          animated: true,
        });
      } else if (fieldName === 'notes' || fieldName === 'tags' || fieldName === 'customFields') {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, 80);
  };

  const handleInputFocus = (fieldName: string) => {
    activeFieldRef.current = fieldName;
    scrollToField(fieldName);
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates.height;
      setKeyboardHeight(height);
      if (activeFieldRef.current) {
        scrollToField(activeFieldRef.current);
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      activeFieldRef.current = null;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Handlers for Login additional URLs
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

  // Format card number with network-aware spacing and detect network
  const handleCardNumberChange = (text: string) => {
    const detection = detectCardNetwork(text);
    const net = detection.network;
    const formatted = formatCardNumber(text, net);
    setCardNumber(formatted);

    const raw = text.replace(/\D/g, '');
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
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a title for this item.');
      return;
    }

    const updatedItem: any = {
      ...existingItem,
      title: title.trim(),
      category,
      tags: tags.length > 0 ? tags : undefined,
      notes: notes.trim() || undefined,
      customFields: customFields.length > 0 ? customFields : [],
    };

    if (category === 'login') {
      updatedItem.username = username.trim() || undefined;
      updatedItem.password = password || undefined;
      updatedItem.url = url.trim() || undefined;
      updatedItem.additionalUrls = additionalUrls.filter((u) => u.trim().length > 0);
    } else if (category === 'card') {
      updatedItem.cardDetails = {
        cardholderName: cardholderName.trim() || undefined,
        cardNumber: cardNumber.replace(/\s+/g, '') || undefined,
        expiryDate: expiryDate.trim() || undefined,
        cvv: cvv.trim() || undefined,
        pin: pin.trim() || undefined,
        cardBrand,
      };
    } else if (category === 'note' || category === 'other') {
      updatedItem.notes = notes.trim() || undefined;
    }

    const success = await updateItem(updatedItem);
    if (success) {
      await HapticService.success();
      router.back();
    }
  };

  const activeCategoryTheme = CATEGORY_THEMES[category] || CATEGORY_THEMES.login;
  const meta = CATEGORY_META[category] || CATEGORY_META.login;

  // GOOGLE KEEP NOTE EXPERIENCE: Clean open canvas, zero form scaffolding
  if (category === 'note' || category === 'other') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <GoogleKeepNoteEditor
          mode="edit"
          initialData={{
            title: existingItem.title,
            notes: existingItem.notes || '',
            tags: existingItem.tags || [],
            isPinned: existingItem.isPinned || false,
            color: existingItem.color,
          }}
          updatedAt={existingItem.updatedAt}
          isLoading={isLoading}
          onSave={async (data) => {
            const updatedItem: VaultItem = {
              ...existingItem,
              title: data.title,
              notes: data.notes,
              tags: data.tags,
              isPinned: data.isPinned,
              color: data.color,
              updatedAt: new Date().toISOString(),
            };
            const success = await updateItem(updatedItem);
            if (success) {
              await HapticService.success();
              router.back();
            }
          }}
          onBack={() => {
            router.back();
          }}
          onDelete={() => {
            Alert.alert(
              'Delete Note',
              `Are you sure you want to delete "${existingItem.title}"?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await HapticService.warning();
                    await deleteItem(existingItem.id);
                    router.back();
                  },
                },
              ]
            );
          }}
        />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: meta.editTitle,
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
              accessibilityLabel="Save vault item changes"
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
          { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 1. LOGIN FORM */}
        {category === 'login' && (
          <View style={styles.card}>
            <View onLayout={(e) => { fieldOffsets.current['title'] = e.nativeEvent.layout.y; }}>
              <Text style={styles.label}>TITLE *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Google, Gmail, GitHub"
                placeholderTextColor="#8E8E93"
                value={title}
                onChangeText={setTitle}
                onFocus={() => handleInputFocus('title')}
              />
            </View>
            <View style={styles.separator} />

            <View onLayout={(e) => { fieldOffsets.current['username'] = e.nativeEvent.layout.y; }}>
              <Text style={styles.label}>USERNAME / EMAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="username@example.com"
                placeholderTextColor="#8E8E93"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                onFocus={() => handleInputFocus('username')}
              />
            </View>
            <View style={styles.separator} />

            <View onLayout={(e) => { fieldOffsets.current['password'] = e.nativeEvent.layout.y; }}>
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
                  autoCapitalize="none"
                  onFocus={() => handleInputFocus('password')}
                />
                <TouchableOpacity
                  onPress={handleTogglePassword}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.6}
                >
                  {showPassword ? <EyeOff color="#8E8E93" size={18} /> : <Eye color="#8E8E93" size={18} />}
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.separator} />

            <View onLayout={(e) => { fieldOffsets.current['url'] = e.nativeEvent.layout.y; }}>
              <Text style={styles.label}>WEBSITE</Text>
              <TextInput
                style={styles.input}
                placeholder="https://google.com"
                placeholderTextColor="#8E8E93"
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                keyboardType="url"
                onFocus={() => handleInputFocus('url')}
              />
            </View>

            {additionalUrls.map((anotherUrl, idx) => (
              <View
                key={idx}
                onLayout={(e) => { fieldOffsets.current[`additionalUrl_${idx}`] = e.nativeEvent.layout.y; }}
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
              <Plus color={activeCategoryTheme.color} size={14} />
              <Text style={[styles.addAnotherText, { color: activeCategoryTheme.color }]}>
                Add Another Website
              </Text>
            </TouchableOpacity>

            <View style={styles.separator} />

            <View onLayout={(e) => { fieldOffsets.current['notes'] = e.nativeEvent.layout.y; }}>
              <Text style={styles.label}>NOTES</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Add a note, recovery keys, hints..."
                placeholderTextColor="#8E8E93"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                onFocus={() => handleInputFocus('notes')}
              />
            </View>

            <View style={styles.separator} />
            <View onLayout={(e) => { fieldOffsets.current['tags'] = e.nativeEvent.layout.y; }}>
              <TagEditor
                tags={tags}
                onChange={setTags}
                accentColor={activeCategoryTheme.color}
                onInputFocus={() => handleInputFocus('tags')}
              />
            </View>

            <View style={styles.separator} />
            <View onLayout={(e) => { fieldOffsets.current['customFields'] = e.nativeEvent.layout.y; }}>
              <CustomFieldEditor
                fields={customFields}
                onChange={setCustomFields}
                accentColor={activeCategoryTheme.color}
                onInputFocus={() => handleInputFocus('customFields')}
              />
            </View>
          </View>
        )}



        {/* 3. CC / DEBIT CARD FORM */}
        {category === 'card' && (
          <>
            {/* Live Interactive Card Preview */}
            <LiveCardPreview
              title={title}
              cardNumber={cardNumber}
              cardholderName={cardholderName}
              expiryDate={expiryDate}
              network={cardBrand}
            />

            <View style={styles.card}>
              {/* TITLE */}
              <View onLayout={(e) => { fieldOffsets.current['title'] = e.nativeEvent.layout.y; }}>
                <Text style={styles.label}>TITLE *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Chase Sapphire, Apple Card, HDFC Regalia"
                  placeholderTextColor="#8E8E93"
                  value={title}
                  onChangeText={setTitle}
                  returnKeyType="next"
                  onSubmitEditing={() => cardholderInputRef.current?.focus()}
                  onFocus={() => handleInputFocus('title')}
                />
              </View>
              <View style={styles.separator} />

              {/* CARDHOLDER NAME */}
              <View onLayout={(e) => { fieldOffsets.current['cardholderName'] = e.nativeEvent.layout.y; }}>
                <Text style={styles.label}>CARDHOLDER NAME</Text>
                <TextInput
                  ref={cardholderInputRef}
                  style={styles.input}
                  placeholder="NAME ON CARD"
                  placeholderTextColor="#8E8E93"
                  value={cardholderName}
                  onChangeText={handleCardholderNameChange}
                  autoCapitalize="characters"
                  returnKeyType="next"
                  onSubmitEditing={() => cardNumberInputRef.current?.focus()}
                  onFocus={() => handleInputFocus('cardholderName')}
                />
              </View>
              <View style={styles.separator} />

              {/* CARD NUMBER */}
              <View onLayout={(e) => { fieldOffsets.current['cardNumber'] = e.nativeEvent.layout.y; }}>
                <View style={styles.rowLabel}>
                  <Text style={styles.label}>CARD NUMBER</Text>
                  {cardValidation.isComplete && (
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
                  )}
                </View>
                <View style={styles.cardNumberInputRow}>
                  <TextInput
                    ref={cardNumberInputRef}
                    style={[styles.input, styles.monoInput, { flex: 1 }]}
                    placeholder="•••• •••• •••• ••••"
                    placeholderTextColor="#8E8E93"
                    value={cardNumber}
                    onChangeText={handleCardNumberChange}
                    keyboardType="number-pad"
                    maxLength={cardBrand === 'amex' ? 17 : 23}
                    returnKeyType="next"
                    onSubmitEditing={() => expiryInputRef.current?.focus()}
                    onFocus={() => handleInputFocus('cardNumber')}
                  />
                  <View style={styles.cardNumberBadgeContainer}>
                    <CardNetworkLogo network={cardBrand} size={22} />
                  </View>
                </View>
                {cardValidation.isComplete && !cardValidation.isValid && cardValidation.errors.includes('INVALID_CHECKSUM') && (
                  <Text style={styles.fieldErrorText}>Card number failed Luhn checksum validation</Text>
                )}
              </View>
              <View style={styles.separator} />

              {/* EXPIRY & CVV ROW */}
              <View
                style={styles.twoColumnRow}
                onLayout={(e) => { fieldOffsets.current['expiryDate'] = e.nativeEvent.layout.y; }}
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
              <View onLayout={(e) => { fieldOffsets.current['pin'] = e.nativeEvent.layout.y; }}>
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
              <View onLayout={(e) => { fieldOffsets.current['cardBrand'] = e.nativeEvent.layout.y; }}>
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

              <View onLayout={(e) => { fieldOffsets.current['notes'] = e.nativeEvent.layout.y; }}>
                <Text style={styles.label}>NOTES</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Bank phone, billing address..."
                  placeholderTextColor="#8E8E93"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  onFocus={() => handleInputFocus('notes')}
                />
              </View>

              <View style={styles.separator} />
              <View onLayout={(e) => { fieldOffsets.current['tags'] = e.nativeEvent.layout.y; }}>
                <TagEditor
                  tags={tags}
                  onChange={setTags}
                  accentColor={activeCategoryTheme.color}
                  onInputFocus={() => handleInputFocus('tags')}
                />
              </View>

              <View style={styles.separator} />
              <View onLayout={(e) => { fieldOffsets.current['customFields'] = e.nativeEvent.layout.y; }}>
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
      </ScrollView>

      <PasswordGeneratorModal
        visible={showGenModal}
        onClose={() => setShowGenModal(false)}
        onUsePassword={(p) => {
          setPassword(p);
          setShowPassword(true);
        }}
      />

      {AuthModal}
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
  notFoundContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    color: '#8E8E93',
    fontSize: 16,
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
});
