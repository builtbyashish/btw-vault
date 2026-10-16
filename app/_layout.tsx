import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { ScreenCaptureService } from '../src/core/security/screenCaptureService';
import { Lock } from 'lucide-react-native';
import { VaultProvider, useVault } from '../src/context/VaultContext';
import { CreateTypeSheet } from '../src/components/CreateTypeSheet';
import { BtwVaultLogo } from '../src/components/BtwVaultLogo';
import { AppSecurityService } from '../src/core/security/appSecurityService';
import { AppHeaderBackButton } from '../src/components/AppHeaderBackButton';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

function RootNavigation() {
  const router = useRouter();
  const segments = useSegments();
  const { status, isLoading, isCreateSheetOpen, closeCreateSheet } = useVault();
  const [isPrivacyCurtainVisible, setIsPrivacyCurtainVisible] = useState(false);

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      const isExternalIntent = AppSecurityService.isSystemActivityActive();
      if ((nextState === 'inactive' || nextState === 'background') && !isExternalIntent) {
        setIsPrivacyCurtainVisible(true);
      } else if (nextState === 'active') {
        setIsPrivacyCurtainVisible(false);
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, []);

  const shouldShowCurtain = isPrivacyCurtainVisible && status !== 'uninitialized';

  useEffect(() => {
    if (isLoading) return;

    const currentSegment = (segments as string[])[0];
    const inAuthGroup = currentSegment === 'unlock' || currentSegment === 'setup';

    if (status === 'locked') {
      if (currentSegment !== 'unlock') {
        router.replace('/unlock');
      }
    } else if (status === 'uninitialized') {
      if (currentSegment !== 'setup') {
        router.replace('/setup');
      }
    } else if (status === 'unlocked') {
      if (inAuthGroup || !currentSegment) {
        router.replace('/(tabs)');
      }
    }
  }, [status, isLoading, segments]);

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#000000',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
            color: '#000000',
          },
          headerTitleAlign: 'left',
          headerShadowVisible: false,
          headerBackVisible: false,
          headerLeft: ({ canGoBack }) =>
            canGoBack ? <AppHeaderBackButton onPress={() => router.back()} /> : null,
          contentStyle: { backgroundColor: '#F2F2F7' },
          animation: 'none',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="setup" options={{ title: 'Initialize Vault', headerShown: false }} />
        <Stack.Screen name="unlock" options={{ title: 'Unlock Vault', headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false, animation: 'default' }} />
        <Stack.Screen
          name="item/create"
          options={{
            title: 'New Item',
          }}
        />
        <Stack.Screen
          name="item/[id]"
          options={{
            title: 'Details',
          }}
        />
        <Stack.Screen
          name="item/edit/[id]"
          options={{
            title: 'Edit',
          }}
        />
        <Stack.Screen
          name="categories"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="about"
          options={{
            headerShown: false,
          }}
        />
      </Stack>

      <CreateTypeSheet
        visible={isCreateSheetOpen}
        onClose={closeCreateSheet}
        onSelectType={(category) => {
          closeCreateSheet();
          router.push({ pathname: '/item/create', params: { type: category } });
        }}
      />

      {shouldShowCurtain && (
        <View style={styles.privacyCurtain} pointerEvents="none">
          <BtwVaultLogo size={42} color="#FFFFFF" style={{ marginBottom: 8 }} />
          <View style={styles.privacyBadge}>
            <Lock color="#38BDF8" size={14} style={{ marginRight: 6 }} />
            <Text style={styles.privacyText}>Vault Secured</Text>
          </View>
        </View>
      )}
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    ScreenCaptureService.syncOnStartup();
  }, []);

  const [fontsLoaded] = useFonts({
    Outfit: require('../assets/fonts/Outfit.ttf'),
    GrandHotel: require('../assets/fonts/GrandHotel-Regular.ttf'),
  });

  return (
    <SafeAreaProvider>
      <VaultProvider>
        <StatusBar style="dark" />
        <RootNavigation />
      </VaultProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  privacyCurtain: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    elevation: 999999,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  privacyText: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
