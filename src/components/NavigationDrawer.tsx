import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
  ScrollView,
  PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  KeyRound,
  Shield,
  Settings,
  Database,
  Lock,
} from 'lucide-react-native';
import { useVault } from '../context/VaultContext';
import { BtwVaultLogo } from './BtwVaultLogo';
import { HapticService } from '../core/haptics';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeRoute?: string;
  onNavigate: (route: string) => void;
}

// Smooth natural deceleration (starts smoothly, glides to a quiet stop)
const EASING_OPEN = Easing.out(Easing.cubic);
// Natural acceleration into dismissal
const EASING_CLOSE = Easing.in(Easing.cubic);

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  activeRoute = 'index',
  onNavigate,
}) => {
  const router = useRouter();
  const { items, lockVault } = useVault();
  const { width: windowWidth } = useWindowDimensions();
  const drawerWidth = Math.min(windowWidth * 0.82, 320);

  const slideAnim = useRef(new Animated.Value(-drawerWidth)).current;

  const drawerWidthRef = useRef(drawerWidth);
  drawerWidthRef.current = drawerWidth;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [isRendered, setIsRendered] = React.useState(isOpen);

  // Synchronously ensure isRendered is true when isOpen becomes true to prevent 1-frame mount lag
  if (isOpen && !isRendered) {
    setIsRendered(true);
  }

  // PanResponder for smooth, physical swipe-to-close gesture
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only trigger on intentional horizontal swipes to the left, without hijacking vertical scroll
        return (
          gestureState.dx < -12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderGrant: () => {
        slideAnim.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx <= 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const width = drawerWidthRef.current;
        // If swiped past 25% of width or flicked with negative velocity, dismiss
        if (gestureState.dx < -width * 0.25 || gestureState.vx < -0.4) {
          Animated.timing(slideAnim, {
            toValue: -width,
            duration: 190,
            easing: EASING_CLOSE,
            useNativeDriver: true,
          }).start(() => {
            onCloseRef.current();
          });
        } else {
          // Spring smoothly back to open
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 9,
            tension: 65,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (isOpen) {
      slideAnim.setValue(-drawerWidth);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 270,
        easing: EASING_OPEN,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -drawerWidth,
        duration: 210,
        easing: EASING_CLOSE,
        useNativeDriver: true,
      }).start(() => {
        setIsRendered(false);
      });
    }
  }, [isOpen, drawerWidth]);

  if (!isRendered) {
    return null;
  }

  const handleNav = (route: string) => {
    onClose();
    onNavigate(route);
  };

  const handleLock = async () => {
    await HapticService.impactMedium();
    onClose();
    lockVault();
    router.replace('/unlock');
  };

  // Synchronous backdrop opacity directly tied to drawer position
  const backdropOpacity = slideAnim.interpolate({
    inputRange: [-drawerWidth, 0],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={isOpen ? 'auto' : 'none'}
    >
      {/* Dimmed Backdrop: pixel-synchronized with drawer position */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel="Close navigation drawer"
        />
      </Animated.View>

      {/* Slide-out Drawer Panel with PanResponder Swipe-to-Dismiss */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.drawerPanel,
          {
            width: drawerWidth,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <SafeAreaView edges={['top']} style={styles.drawerHeaderArea}>
          {/* Header Branding */}
          <View style={styles.brandRow}>
            <View style={styles.brandTextGroup}>
              <BtwVaultLogo size={24} />
            </View>
          </View>
        </SafeAreaView>

        {/* Navigation Destinations */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            {/* Vault Items */}
            <TouchableOpacity
              style={[
                styles.navItem,
                activeRoute === 'index' && styles.navItemActive,
              ]}
              onPress={() => handleNav('/(tabs)')}
              activeOpacity={0.5}
            >
              <KeyRound
                color={activeRoute === 'index' ? '#007AFF' : '#3C4043'}
                size={20}
                style={styles.navIcon}
              />
              <Text
                style={[
                  styles.navLabel,
                  activeRoute === 'index' && styles.navLabelActive,
                ]}
              >
                Vault Items
              </Text>
              <View
                style={[
                  styles.badge,
                  activeRoute === 'index' && styles.badgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    activeRoute === 'index' && styles.badgeTextActive,
                  ]}
                >
                  {items.length}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Watchtower */}
            <TouchableOpacity
              style={[
                styles.navItem,
                activeRoute === 'health' && styles.navItemActive,
              ]}
              onPress={() => handleNav('/(tabs)/health')}
              activeOpacity={0.5}
            >
              <Shield
                color={activeRoute === 'health' ? '#007AFF' : '#3C4043'}
                size={20}
                style={styles.navIcon}
              />
              <Text
                style={[
                  styles.navLabel,
                  activeRoute === 'health' && styles.navLabelActive,
                ]}
              >
                Watchtower
              </Text>
            </TouchableOpacity>

            {/* Settings */}
            <TouchableOpacity
              style={[
                styles.navItem,
                activeRoute === 'settings' && styles.navItemActive,
              ]}
              onPress={() => handleNav('/(tabs)/settings')}
              activeOpacity={0.5}
            >
              <Settings
                color={activeRoute === 'settings' ? '#007AFF' : '#3C4043'}
                size={20}
                style={styles.navIcon}
              />
              <Text
                style={[
                  styles.navLabel,
                  activeRoute === 'settings' && styles.navLabelActive,
                ]}
              >
                Settings
              </Text>
            </TouchableOpacity>

            {/* Encrypted Database Inspector */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => handleNav('/settings/encrypted-db')}
              activeOpacity={0.5}
            >
              <Database color="#3C4043" size={20} style={styles.navIcon} />
              <Text style={styles.navLabel}>Encrypted Database</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.divider} />

        {/* Footer Area with Clean Minimal Lock Action */}
        <SafeAreaView edges={['bottom']} style={styles.drawerFooter}>
          <TouchableOpacity
            style={styles.lockBtn}
            onPress={handleLock}
            activeOpacity={0.65}
            accessibilityRole="button"
            accessibilityLabel="Lock vault"
          >
            <Lock size={18} color="#DC2626" strokeWidth={2.2} style={styles.lockIcon} />
            <Text style={styles.lockTitle}>Lock Vault</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

export default NavigationDrawer;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 16,
  },
  drawerHeaderArea: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTextGroup: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 16,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  section: {
    marginBottom: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: '#EAF3FF',
  },
  navIcon: {
    marginRight: 14,
  },
  navLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#3C4043',
  },
  navLabelActive: {
    fontWeight: '700',
    color: '#007AFF',
  },
  badge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeActive: {
    backgroundColor: '#007AFF',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  drawerFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 23,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 4,
  },
  lockIcon: {
    marginRight: 12,
  },
  lockTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#DC2626',
    letterSpacing: -0.1,
  },
});
