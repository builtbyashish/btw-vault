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
} from 'lucide-react-native';
import { CustomField, CustomFieldType } from '../types';

interface CustomFieldEditorProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
  accentColor?: string;
  onInputFocus?: (e: any) => void;
}

interface FieldTypeDefinition {
  type: CustomFieldType;
  label: string;
  icon: any;
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'url';
  color: string;
}

const PREDEFINED_TYPES: FieldTypeDefinition[] = [
  {
    type: 'text',
    label: 'Text',
    icon: Type,
    placeholder: 'Field value',
    keyboardType: 'default',
    color: '#007AFF',
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

            <View style={styles.valueRow}>
              <TextInput
                style={[
                  styles.valueInput,
                  field.type === 'hidden' && styles.monoText,
                ]}
                placeholder={typeDef.placeholder}
                placeholderTextColor="#8E8E93"
                keyboardType={typeDef.keyboardType || 'default'}
                autoCapitalize={
                  field.type === 'email' || field.type === 'url' || field.type === 'link'
                    ? 'none'
                    : 'sentences'
                }
                secureTextEntry={field.type === 'hidden' && !showHidden[field.id]}
                value={field.value}
                onChangeText={(txt) => handleUpdateField(field.id, 'value', txt)}
                onFocus={onInputFocus}
              />
              {field.type === 'hidden' && (
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
  valueInput: {
    flex: 1,
    color: '#000000',
    fontSize: 14,
    paddingVertical: 9,
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
});
