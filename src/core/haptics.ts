import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

export const HapticService = {
  /** Crisp tactile tap for copying credentials, copying passwords/urls */
  copy: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Vibration.vibrate(20);
    }
  },

  /** Subtle tick for toggles (eye reveal/conceal, filters, type picker) */
  selection: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.selectionAsync();
    } catch {
      Vibration.vibrate(10);
    }
  },

  /** Confirmed success vibration for saving to vault, vault unlock */
  success: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Vibration.vibrate([0, 30, 40, 30]);
    }
  },

  /** Destructive / warning vibration for item deletion, failed attempts */
  warning: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      Vibration.vibrate([0, 50, 50, 50]);
    }
  },

  /** Prominent impact for key triggers like FAB open, regenerate password */
  impactMedium: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      Vibration.vibrate(35);
    }
  },
};

export default HapticService;
