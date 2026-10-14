import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Type,
  Hash,
  Globe,
  Link as LinkIcon,
  Calendar,
  Clock,
  Mail,
  Lock,
  X,
  ChevronDown,
  AlignLeft,
  KeyRound,
  CreditCard,
  CheckSquare,
  ListFilter,
} from 'lucide-react-native';
import { CustomField, CustomFieldType } from '../types';
import { DatePickerModal, formatFriendlyDate, formatFriendlyTime } from './DatePickerModal';
import { DropdownPickerModal, parseMultiSelectValues } from './DropdownPickerModal';
import { HapticService } from '../core/haptics';

interface CustomFieldEditorProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
  accentColor?: string;
  onInputFocus?: (e: any) => void;
}

export interface FieldTypeDefinition {
  type: CustomFieldType;
  label: string;
  icon: any;
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'url';
  color: string;
}

export const PREDEFINED_TYPES: FieldTypeDefinition[] = [
  {
    type: 'text',
    label: 'Text',
    icon: Type,
    placeholder: 'Field value',
    keyboardType: 'default',
    color: '#007AFF',
  },
  {
    type: 'textarea',
    label: 'Text Area',
    icon: AlignLeft,
    placeholder: 'Multiline text (e.g. backup codes, notes, keys)',
    keyboardType: 'default',
    color: '#0EA5E9',
  },
  {
    type: 'select',
    label: 'Dropdown',
    icon: CheckSquare,
    placeholder: 'Select option...',
    keyboardType: 'default',
    color: '#007AFF',
  },
  {
    type: 'multiselect',
    label: 'Multi-Select',
    icon: ListFilter,
    placeholder: 'Select options...',
    keyboardType: 'default',
    color: '#0284C7',
  },
  {
    type: 'key',
    label: 'Secret Key / Token',
    icon: KeyRound,
    placeholder: 'MFA Secret, Private Key, API Token',
    keyboardType: 'default',
    color: '#8B5CF6',
  },
  {
    type: 'payment',
    label: 'Payment / Account',
    icon: CreditCard,
    placeholder: 'IBAN, Routing, Account or Amount',
    keyboardType: 'default',
    color: '#EC4899',
  },
  {
    type: 'number',
    label: 'Number',
    icon: Hash,
    placeholder: 'e.g. 123456',
    keyboardType: 'numeric',
    color: '#FF9500',
  },
  {
    type: 'url',
    label: 'Website / URL',
    icon: Globe,
    placeholder: 'https://example.com',
    keyboardType: 'url',
    color: '#34C759',
  },
  {
    type: 'link',
    label: 'Link',
    icon: LinkIcon,
    placeholder: 'Link address or path',
    keyboardType: 'url',
    color: '#5856D6',
  },
  {
    type: 'date',
    label: 'Date',
    icon: Calendar,
    placeholder: 'YYYY-MM-DD',
    keyboardType: 'default',
    color: '#AF52DE',
  },
  {
    type: 'time',
    label: 'Time',
    icon: Clock,
    placeholder: 'HH:MM (e.g. 14:30)',
    keyboardType: 'default',
    color: '#FF2D55',
  },
  {
    type: 'email',
    label: 'Email',
    icon: Mail,
    placeholder: 'name@example.com',
    keyboardType: 'email-address',
    color: '#007AFF',
  },
  {
    type: 'hidden',
    label: 'Secret / Concealed',
    icon: Lock,
    placeholder: 'Secret token or recovery phrase',
    keyboardType: 'default',
    color: '#FF3B30',
  },
];

export const CustomFieldEditor: React.FC<CustomFieldEditorProps> = ({
  fields,
  onChange,
  accentColor = '#007AFF',
  onInputFocus,
}) => {
  const [showHidden, setShowHidden] = useState<{ [key: string]: boolean }>({});
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [activeEditingFieldId, setActiveEditingFieldId] = useState<string | null>(null);
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

  const getTypeDef = (type: CustomFieldType): FieldTypeDefinition => {
    return PREDEFINED_TYPES.find((t) => t.type === type) || PREDEFINED_TYPES[0];
  };

  const handleOpenAddPicker = () => {
    setActiveEditingFieldId(null);
    setPickerModalVisible(true);
  };

  const handleOpenChangeTypePicker = (fieldId: string) => {
    setActiveEditingFieldId(fieldId);
    setPickerModalVisible(true);
  };

  const handleSelectType = (selectedType: CustomFieldType) => {
    if (activeEditingFieldId) {
      // Changing type of existing field
      handleUpdateField(activeEditingFieldId, 'type', selectedType);
    } else {
      // Adding new field
      const newField: CustomField = {
        id: Date.now().toString(),
        label: '',
        value: '',
        type: selectedType,
      };
      onChange([...fields, newField]);
    }
    setPickerModalVisible(false);
    setActiveEditingFieldId(null);
  };

  const handleUpdateField = (id: string, key: keyof CustomField, value: any) => {
    const updated = fields.map((f) => (f.id === id ? { ...f, [key]: value } : f));
    onChange(updated);
  };

  const handleRemoveField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  };

  return (
    <View style={styles.container}>
      {fields.length === 0 ? (
        <TouchableOpacity
          style={[styles.compactAddBtn, { borderColor: `${accentColor}40` }]}
          onPress={handleOpenAddPicker}
          activeOpacity={0.7}
        >
          <View style={[styles.compactPlusCircle, { backgroundColor: `${accentColor}15` }]}>
            <Plus color={accentColor} size={13} strokeWidth={2.4} />
          </View>
          <Text style={[styles.compactAddText, { color: accentColor }]}>
            Add Custom Field
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>CUSTOM FIELDS</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: `${accentColor}18` }]}
            onPress={handleOpenAddPicker}
            activeOpacity={0.7}
          >
            <Plus color={accentColor} size={14} />
            <Text style={[styles.addBtnText, { color: accentColor }]}>Add Another</Text>
          </TouchableOpacity>
        </View>
      )}

      {fields.map((field) => {
        const typeDef = getTypeDef(field.type);
        const Icon = typeDef.icon;

        return (
          <View key={field.id} style={styles.fieldCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.typeIconBox, { backgroundColor: `${typeDef.color}18` }]}>
                <Icon color={typeDef.color} size={14} />
              </View>

              <TextInput
                style={styles.labelInput}
                placeholder={`Field Label (e.g. ${
                  field.type === 'number'
                    ? 'Account #'
                    : field.type === 'date'
                    ? 'Expiry Date'
                    : field.type === 'email'
                    ? 'Recovery Email'
                    : field.type === 'hidden'
                    ? 'Secret Code'
                    : 'Field Name'
                })`}
                placeholderTextColor="#8E8E93"
                value={field.label}
                onChangeText={(txt) => handleUpdateField(field.id, 'label', txt)}
                onFocus={onInputFocus}
              />

              <TouchableOpacity
                style={styles.typeBadge}
                onPress={() => handleOpenChangeTypePicker(field.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.typeText, { color: typeDef.color }]}>
                  {typeDef.label}
                </Text>
                <ChevronDown color={typeDef.color} size={12} style={{ marginLeft: 3 }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleRemoveField(field.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Trash2 color="#FF3B30" size={16} />
              </TouchableOpacity>
            </View>

            {field.type === 'textarea' ? (
              <View style={styles.textareaEditorBox}>
                <TextInput
                  style={styles.textareaEditorInput}
                  placeholder={typeDef.placeholder}
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={3}
                  value={field.value}
                  onChangeText={(txt) => handleUpdateField(field.id, 'value', txt)}
                  onFocus={onInputFocus}
                />
                <View style={styles.textareaEditorFooter}>
                  <Text style={styles.textareaEditorCounter}>
                    {field.value
                      ? `${field.value.split('\n').length} line${field.value.split('\n').length === 1 ? '' : 's'} · ${field.value.length} char${field.value.length === 1 ? '' : 's'}`
                      : 'Multiline text area'}
                  </Text>
                </View>
              </View>
            ) : field.type === 'date' || field.type === 'time' ? (
              <TouchableOpacity
                style={styles.pickerValueButton}
                onPress={() => {
                  HapticService.selection();
                  setActivePickerField({
                    id: field.id,
                    mode: field.type as 'date' | 'time',
                    title: field.label || (field.type === 'date' ? 'Date' : 'Time'),
                    value: field.value,
                  });
                }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerValueText, !field.value && styles.pickerPlaceholderText]}>
                    {field.value
                      ? field.type === 'date'
                        ? formatFriendlyDate(field.value)
                        : formatFriendlyTime(field.value)
                      : typeDef.placeholder}
                  </Text>
                  {field.value ? (
                    <Text style={styles.pickerSubText}>{field.value}</Text>
                  ) : null}
                </View>
                <ChevronDown size={15} color="#8E8E93" />
              </TouchableOpacity>
            ) : field.type === 'select' || field.type === 'multiselect' ? (
              <TouchableOpacity
                style={styles.pickerValueButton}
                onPress={() => {
                  HapticService.selection();
                  setActiveDropdownField({
                    id: field.id,
                    title: field.label || (field.type === 'select' ? 'Select Option' : 'Select Options'),
                    mode: field.type as 'select' | 'multiselect',
                    options: field.options || [],
                    value: field.value || '',
                  });
                }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  {field.type === 'multiselect' && field.value ? (
                    <View style={styles.multiSelectChipsWrap}>
                      {parseMultiSelectValues(field.value).map((val, idx) => (
                        <View key={idx} style={styles.multiSelectChip}>
                          <Text style={styles.multiSelectChipText}>{val}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.pickerValueText, !field.value && styles.pickerPlaceholderText]}>
                      {field.value || typeDef.placeholder}
                    </Text>
                  )}
                </View>
                <ChevronDown size={15} color="#8E8E93" />
              </TouchableOpacity>
            ) : (
              <View style={styles.valueRow}>
                <TextInput
                  style={[
                    styles.valueInput,
                    (field.type === 'hidden' || field.type === 'key' || field.type === 'payment' || field.type === 'number') && styles.monoText,
                  ]}
                  placeholder={typeDef.placeholder}
                  placeholderTextColor="#8E8E93"
                  keyboardType={typeDef.keyboardType || 'default'}
                  autoCapitalize={
                    field.type === 'email' || field.type === 'url' || field.type === 'link' || field.type === 'key'
                      ? 'none'
                      : field.type === 'payment'
                      ? 'characters'
                      : 'sentences'
                  }
                  secureTextEntry={(field.type === 'hidden' || field.type === 'key') && !showHidden[field.id]}
                  value={field.value}
                  onChangeText={(txt) => handleUpdateField(field.id, 'value', txt)}
                  onFocus={onInputFocus}
                />
                {(field.type === 'hidden' || field.type === 'key') && (
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.6}
                    onPress={() =>
                      setShowHidden((prev) => ({ ...prev, [field.id]: !prev[field.id] }))
                    }
                  >
                    {showHidden[field.id] ? (
                      <EyeOff color="#8E8E93" size={18} />
                    ) : (
                      <Eye color="#8E8E93" size={18} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* Field Type Picker Modal */}
      <Modal
        visible={pickerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setPickerModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalSheet}>
                <View style={styles.modalIndicator} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {activeEditingFieldId ? 'Change Field Type' : 'Select Pre-defined Type'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setPickerModalVisible(false)}
                    style={styles.modalCloseBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                  >
                    <X color="#8E8E93" size={18} />
                  </TouchableOpacity>
                </View>

                <View style={styles.typeGrid}>
                  {PREDEFINED_TYPES.map((t) => {
                    const TypeIcon = t.icon;
                    return (
                      <TouchableOpacity
                        key={t.type}
                        style={styles.typeOptionCard}
                        onPress={() => handleSelectType(t.type)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.typeOptionIconBox, { backgroundColor: `${t.color}15` }]}>
                          <TypeIcon color={t.color} size={20} />
                        </View>
                        <View style={styles.typeOptionInfo}>
                          <Text style={styles.typeOptionLabel}>{t.label}</Text>
                          <Text style={styles.typeOptionDesc} numberOfLines={1}>
                            {t.placeholder}
                          </Text>
                        </View>
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

      {/* Date / Time Picker Modal */}
      {activePickerField && (
        <DatePickerModal
          visible={!!activePickerField}
          mode={activePickerField.mode}
          title={activePickerField.title}
          initialValue={activePickerField.value}
          accentColor={accentColor}
          onClose={() => setActivePickerField(null)}
          onSelect={(val) => {
            handleUpdateField(activePickerField.id, 'value', val);
            setActivePickerField(null);
          }}
        />
      )}

      {activeDropdownField && (
        <DropdownPickerModal
          visible={activeDropdownField !== null}
          title={activeDropdownField.title}
          mode={activeDropdownField.mode}
          options={activeDropdownField.options}
          selectedValue={activeDropdownField.value}
          accentColor={accentColor}
          onSelect={(val) => {
            handleUpdateField(activeDropdownField.id, 'value', val);
          }}
          onClose={() => setActiveDropdownField(null)}
        />
      )}
    </View>
  );
};

export default CustomFieldEditor;

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  compactAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    gap: 8,
  },
  compactPlusCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactAddText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  fieldCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  labelInput: {
    flex: 1,
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  valueRowMultiline: {
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  valueInput: {
    flex: 1,
    color: '#000000',
    fontSize: 14,
    paddingVertical: 9,
  },
  valueInputMultiline: {
    minHeight: 68,
    textAlignVertical: 'top',
    paddingTop: 8,
    paddingBottom: 8,
  },
  monoText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#007AFF',
  },
  eyeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 20,
  },
  modalIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    alignSelf: 'center',
    marginVertical: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeGrid: {
    gap: 8,
    marginBottom: 10,
  },
  typeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
  },
  typeOptionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeOptionInfo: {
    flex: 1,
  },
  typeOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  typeOptionDesc: {
    fontSize: 12,
    color: '#8E8E93',
  },
  textareaEditorBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: 10,
  },
  textareaEditorInput: {
    fontSize: 14,
    color: '#000000',
    minHeight: 68,
    textAlignVertical: 'top',
    lineHeight: 20,
    padding: 0,
  },
  textareaEditorFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    paddingTop: 6,
    marginTop: 6,
  },
  textareaEditorCounter: {
    fontSize: 11,
    color: '#8E8E93',
  },
  pickerValueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerValueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  pickerPlaceholderText: {
    color: '#8E8E93',
    fontWeight: '400',
  },
  pickerSubText: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  multiSelectChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 2,
  },
  multiSelectChip: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  multiSelectChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
  },
});
