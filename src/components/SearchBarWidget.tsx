import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, X } from 'lucide-react-native';

export interface SearchBarWidgetProps {
  value?: string;
  query?: string;
  onChangeText?: (text: string) => void;
  onChangeQuery?: (text: string) => void;
  onClear?: () => void;
  autoFocus?: boolean;
}

export function SearchBarWidget({
  value,
  query,
  onChangeText,
  onChangeQuery,
  onClear,
  autoFocus,
}: SearchBarWidgetProps) {
  const currentVal = query !== undefined ? query : (value || '');
  const handleChange = (text: string) => {
    if (onChangeQuery) onChangeQuery(text);
    if (onChangeText) onChangeText(text);
  };
  const handleClear = () => {
    if (onClear) onClear();
    if (onChangeQuery) onChangeQuery('');
    if (onChangeText) onChangeText('');
  };

  return (
    <View style={styles.container}>
      <Search color="#8E8E93" size={18} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={currentVal}
        onChangeText={handleChange}
        placeholder="Search vault..."
        placeholderTextColor="#8E8E93"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
      />
      {currentVal.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          style={styles.clearButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <X color="#8E8E93" size={16} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default SearchBarWidget;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    height: '100%',
  },
  clearButton: {
    padding: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  },
});
