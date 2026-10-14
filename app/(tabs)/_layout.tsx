import React, { useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Menu,
  ArrowLeft,
  Search,
  X,
  LayoutList,
  LayoutGrid,
} from 'lucide-react-native';
import { useVault } from '../../src/context/VaultContext';
import { NavigationDrawer } from '../../src/components/NavigationDrawer';
import { BtwVaultLogo } from '../../src/components/BtwVaultLogo';
import { BiometricSetupModal } from '../../src/components/BiometricSetupModal';

export default function TabLayout() {
  const router = useRouter();
  const { viewMode, toggleViewMode } = useVault();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: styles.header,
          headerTitleStyle: styles.headerTitle,
          headerTitleAlign: 'left',
          headerShadowVisible: false,
          // Bottom tab bar completely removed in favor of Google Keep-style Navigation Drawer
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            headerTitle: () => <BtwVaultLogo size={24} />,
            headerLeft: () => (
              <TouchableOpacity
                style={styles.hamburgerBtn}
                onPress={() => setIsDrawerOpen(true)}
                activeOpacity={0.5}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Open navigation drawer"
              >
                <Menu color="#000000" size={24} strokeWidth={2.2} />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <View style={styles.headerRightGroup}>

                {/* View Mode Toggle Button: immediately to the left of Search Button */}
                <TouchableOpacity
                  style={styles.whiteCircleBtn}
                  onPress={toggleViewMode}
                  activeOpacity={0.5}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={viewMode === 'dynamic' ? 'Switch to list view' : 'Switch to dynamic view'}
                  accessibilityRole="button"
                >
                  {viewMode === 'dynamic' ? (
                    <LayoutList
                      color="#000000"
                      size={18}
                      strokeWidth={2.2}
                    />
                  ) : (
                    <LayoutGrid
                      color="#000000"
                      size={18}
                      strokeWidth={2.2}
                    />
                  )}
                </TouchableOpacity>

                {/* White Circle Search Button (opens Google Keep style search page) */}
                <TouchableOpacity
                  style={styles.whiteCircleBtn}
                  onPress={() => router.push('/search')}
                  activeOpacity={0.5}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Search vault"
                  accessibilityRole="button"
                >
                  <Search
                    color="#000000"
                    size={18}
                    strokeWidth={2.2}
                  />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="health"
          options={{
            title: 'Watchtower',
            headerLeft: () => (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => router.push('/(tabs)')}
                activeOpacity={0.5}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Back to vault"
              >
                <ArrowLeft color="#000000" size={22} strokeWidth={2.4} />
              </TouchableOpacity>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            headerLeft: () => (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => router.push('/(tabs)')}
                activeOpacity={0.5}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Back to vault"
              >
                <ArrowLeft color="#000000" size={22} strokeWidth={2.4} />
              </TouchableOpacity>
            ),
          }}
        />
      </Tabs>

      {/* Google Keep-style Slide-out Navigation Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={(route) => router.push(route as any)}
      />

      {/* Post-Import & Scheduled Biometric Setup Modal */}
      <BiometricSetupModal />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontWeight: '600',
    fontSize: 18,
    color: '#000000',
    letterSpacing: -0.3,
  },
  headerLogoText: {
    fontFamily: 'GrandHotel',
    fontSize: 34,
    color: '#000000',
    letterSpacing: -0.5,
    includeFontPadding: false,
    paddingBottom: 2,
  },
  headerCategoryTitle: {
    fontWeight: '600',
    fontSize: 18,
    color: '#000000',
    letterSpacing: -0.3,
  },
  hamburgerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    gap: 8,
  },
  whiteCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerClearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#EAF3FF',
    marginRight: 10,
    gap: 4,
  },
  headerClearText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
  },
});
