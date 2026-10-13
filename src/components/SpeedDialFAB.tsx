import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import {
  Plus,
  KeyRound,
  CreditCard,
  StickyNote,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ItemCategory } from '../types';
import { HapticService } from '../core/haptics';

export interface SpeedDialFABRef {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

interface SpeedDialFABProps {
  onSelectOption: (category: ItemCategory) => void;
}

interface OptionConfig {
  type: ItemCategory;
  label: string;
  color: string;
  icon: any;
}

// Ordered from top to bottom (Note is lowest, sitting closest to the FAB)
const SPEED_DIAL_OPTIONS: OptionConfig[] = [
  {
    type: 'login',
    label: 'Login',
    color: '#FFB703', // 🟡 Gold Yellow
    icon: KeyRound,
  },
  {
    type: 'card',
    label: 'Card',
    color: '#E91E63', // 💖 Magenta Pink
    icon: CreditCard,
  },
  {
    type: 'note',
    label: 'Note',
    color: '#7C4DFF', // 🟣 Purple
    icon: StickyNote,
  },
];

// Material 3 Motion Curves
const EASING_OPEN = Easing.bezier(0.05, 0.7, 0.1, 1.0);  // Emphasized Decelerate
const EASING_CLOSE = Easing.bezier(0.3, 0.0, 0.8, 0.15); // Emphasized Accelerate

export const SpeedDialFAB = forwardRef<SpeedDialFABRef, SpeedDialFABProps>(
  ({ onSelectOption }, ref) => {
    const insets = useSafeAreaInsets();
    const bottomInset = insets.bottom || 0;
    const [isOpen, setIsOpen] = useState(false);
    const [isRendered, setIsRendered] = useState(false);

    // Animation values
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const fabRotateAnim = useRef(new Animated.Value(0)).current;
    const itemsAnim = useRef(
      SPEED_DIAL_OPTIONS.map(() => new Animated.Value(0))
    ).current;

    const openSpeedDial = () => {
      HapticService.impactMedium();
      setIsRendered(true);
      setIsOpen(true);

      backdropAnim.setValue(0);
      fabRotateAnim.setValue(0);
      itemsAnim.forEach((anim) => anim.setValue(0));

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          easing: EASING_OPEN,
          useNativeDriver: true,
        }),
        Animated.timing(fabRotateAnim, {
          toValue: 1,
          duration: 240,
          easing: EASING_OPEN,
          useNativeDriver: true,
        }),
        // Stagger options from BOTTOM to TOP (Note first, then Doc, then Card, then Login)
        Animated.stagger(
          42,
          [...itemsAnim].reverse().map((anim) =>
            Animated.spring(anim, {
              toValue: 1,
              friction: 6,
              tension: 65,
              useNativeDriver: true,
            })
          )
        ),
      ]).start();
    };

    const closeSpeedDial = (callback?: () => void) => {
      setIsOpen(false);

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 160,
          easing: EASING_CLOSE,
          useNativeDriver: true,
        }),
        Animated.timing(fabRotateAnim, {
          toValue: 0,
          duration: 160,
          easing: EASING_CLOSE,
          useNativeDriver: true,
        }),
        // Retract options smoothly downwards back towards the FAB
        Animated.stagger(
          20,
          itemsAnim.map((anim) =>
            Animated.timing(anim, {
              toValue: 0,
              duration: 130,
              easing: EASING_CLOSE,
              useNativeDriver: true,
            })
          )
        ),
      ]).start(() => {
        setIsRendered(false);
        if (callback) callback();
      });
    };

    useImperativeHandle(ref, () => ({
      open: openSpeedDial,
      close: () => closeSpeedDial(),
      toggle: () => {
        if (isOpen) {
          closeSpeedDial();
        } else {
          openSpeedDial();
        }
      },
    }));

    const handleToggle = () => {
      if (isOpen) {
        closeSpeedDial();
      } else {
        openSpeedDial();
      }
    };

    const handleSelect = (category: ItemCategory) => {
      HapticService.selection();
      closeSpeedDial(() => {
        onSelectOption(category);
      });
    };

    const spin = fabRotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '45deg'],
    });

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* On-screen FAB when speed dial is closed */}
        {!isRendered && (
          <View
            style={[styles.fabPosition, { bottom: bottomInset + 20 }]}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              style={styles.mainFab}
              onPress={handleToggle}
              activeOpacity={0.5}
              accessibilityRole="button"
              accessibilityLabel="Add vault item"
              accessibilityHint="Toggles creation options for logins, cards, and notes"
            >
              <Plus color="#FFFFFF" size={26} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        )}

        {/* Full-Screen Speed Dial Overlay (Modal covers the entire screen, including navigation header & status bar) */}
        <Modal
          visible={isRendered}
          transparent
          animationType="none"
          statusBarTranslucent={true}
          onRequestClose={() => closeSpeedDial()}
        >
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Full-screen Dimmed Backdrop */}
            <Animated.View
              style={[
                styles.backdrop,
                {
                  opacity: backdropAnim,
                },
              ]}
              pointerEvents={isOpen ? 'auto' : 'none'}
            >
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                onPress={() => closeSpeedDial()}
                activeOpacity={1}
                accessibilityRole="button"
                accessibilityLabel="Dismiss options"
              />
            </Animated.View>

            {/* Floating Speed Dial Action Options */}
            <View
              style={[styles.optionsContainer, { bottom: bottomInset + 88 }]}
              pointerEvents={isOpen ? 'box-none' : 'none'}
            >
              {SPEED_DIAL_OPTIONS.map((opt, index) => {
                const IconComponent = opt.icon;
                const anim = itemsAnim[index];

                const translateY = anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                });

                const scale = anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.15, 1],
                });

                const opacity = anim.interpolate({
                  inputRange: [0, 0.25, 1],
                  outputRange: [0, 0.7, 1],
                });

                return (
                  <Animated.View
                    key={opt.type}
                    style={[
                      styles.optionRowWrapper,
                      {
                        opacity,
                        transform: [{ translateY }, { scale }],
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.optionRow}
                      onPress={() => handleSelect(opt.type)}
                      activeOpacity={0.5}
                      accessibilityRole="button"
                      accessibilityLabel={`Create ${opt.label}`}
                    >
                      {/* Clean White Label Pill */}
                      <View style={styles.labelPill}>
                        <Text style={styles.labelText}>{opt.label}</Text>
                      </View>

                      {/* Vibrant Action Circle Button */}
                      <View
                        style={[
                          styles.optionCircle,
                          { backgroundColor: opt.color },
                        ]}
                      >
                        <IconComponent
                          color="#FFFFFF"
                          size={20}
                          strokeWidth={2.2}
                        />
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>

            {/* Rotating FAB button in Modal (exact same location, rotates + into X) */}
            <View
              style={[styles.fabPosition, { bottom: bottomInset + 20 }]}
              pointerEvents="box-none"
            >
              <TouchableOpacity
                style={styles.mainFab}
                onPress={handleToggle}
                activeOpacity={0.5}
                accessibilityRole="button"
                accessibilityLabel="Close creation options"
                accessibilityHint="Toggles creation options for logins, cards, and notes"
              >
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Plus color="#FFFFFF" size={26} strokeWidth={2.4} />
                </Animated.View>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }
);

SpeedDialFAB.displayName = 'SpeedDialFAB';

export default SpeedDialFAB;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  // Anchored above FAB with clean 12px gap
  optionsContainer: {
    position: 'absolute',
    right: 20,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 12,
  },
  optionRowWrapper: {
    alignItems: 'flex-end',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  labelPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 2.5,
    elevation: Platform.OS === 'android' ? 2 : 0,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.2,
  },
  optionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  // Anchored at bottom right
  fabPosition: {
    position: 'absolute',
    right: 20,
  },
  mainFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
});
