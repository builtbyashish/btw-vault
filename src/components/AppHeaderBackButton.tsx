import React from 'react';
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { HapticService } from '../core/haptics';

interface AppHeaderBackButtonProps {
  onPress?: () => void;
  color?: string;
  size?: number;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Unified native header back button across btw vault.
 * Guarantees identical icon geometry, stroke, touch target, and haptics across all screens.
 */
export const AppHeaderBackButton: React.FC<AppHeaderBackButtonProps> = ({
  onPress,
  color = '#000000',
  size = 22,
  strokeWidth = 2.2,
  style,
  accessibilityLabel = 'Go back',
}) => {
  const router = useRouter();

  const handlePress = () => {
    HapticService.selection();
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.backButton, style]}
      onPress={handlePress}
      activeOpacity={0.6}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <ArrowLeft color={color} size={size} strokeWidth={strokeWidth} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    marginRight: 6,
  },
});

export default AppHeaderBackButton;
