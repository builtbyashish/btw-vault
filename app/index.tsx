import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useVault } from '../src/context/VaultContext';

export default function IndexScreen() {
  const { status, isLoading } = useVault();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (status === 'uninitialized') {
      router.replace('/setup');
    } else if (status === 'locked') {
      router.replace('/unlock');
    } else if (status === 'unlocked') {
      router.replace('/(tabs)');
    }
  }, [status, isLoading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
