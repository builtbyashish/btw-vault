import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Tag, Plus, X } from 'lucide-react-native';

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  accentColor?: string;
  onInputFocus?: (e: any) => void;
}

export const TagEditor: React.FC<TagEditorProps> = ({
  tags,
  onChange,
  accentColor = '#007AFF',
  onInputFocus,
}) => {
  const [inputText, setInputText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    const trimmed = inputText.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputText('');
      setIsAdding(false);
    }
  };

  const handleRemove = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Tag color="#8E8E93" size={14} style={{ marginRight: 6 }} />
          <Text style={styles.label}>TAGS</Text>
        </View>
        {!isAdding && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setIsAdding(true)}
            activeOpacity={0.7}
          >
            <Plus color={accentColor} size={14} />
            <Text style={[styles.addBtnText, { color: accentColor }]}>Add Tag</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tagsWrapper}>
        {tags.map((tag) => (
          <View key={tag} style={styles.tagChip}>
            <Text style={styles.tagText}>#{tag}</Text>
            <TouchableOpacity
              onPress={() => handleRemove(tag)}
              style={styles.removeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.6}
            >
              <X color="#8E8E93" size={12} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        ))}

        {isAdding && (
          <View style={styles.inputChip}>
            <TextInput
              style={styles.input}
              placeholder="Tag name..."
              placeholderTextColor="#8E8E93"
              value={inputText}
              onChangeText={setInputText}
              autoFocus
              onFocus={onInputFocus}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={handleAdd}
              style={styles.confirmBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Plus color={accentColor} size={16} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsAdding(false)}
              style={styles.cancelBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <X color="#8E8E93" size={14} />
            </TouchableOpacity>
          </View>
        )}

        {tags.length === 0 && !isAdding && (
          <Text style={styles.emptyHint}>No tags added yet</Text>
        )}
      </View>
    </View>
  );
};

export default TagEditor;

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000000',
    marginRight: 6,
  },
  removeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  inputChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  input: {
    fontSize: 13,
    color: '#000000',
    minWidth: 80,
    paddingVertical: 2,
  },
  confirmBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  cancelBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  emptyHint: {
    fontSize: 13,
    color: '#C7C7CC',
    fontStyle: 'italic',
  },
});
