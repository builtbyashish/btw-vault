import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppHeaderBackButton } from './AppHeaderBackButton';

export interface AppHeaderProps {
  title: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  showBack?: boolean;
}

/**
 * AppHeader
 *
 * Pixel-perfect unified top app bar matching Settings and Watchtower.
 * Guarantees identical 56dp height, hairline divider (#E5E5EA), back button alignment,
 * and font styling across all pages.
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  onBack,
  rightElement,
  style,
  titleStyle,
  showBack = true,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={[styles.headerBar, style]}>
        <View style={styles.leftGroup}>
          {showBack ? (
            <AppHeaderBackButton
              onPress={handleBack}
              style={styles.backBtn}
              accessibilityLabel={`Go back from ${title}`}
            />
          ) : (
            <View style={{ width: 12 }} />
          )}
          <Text
            style={[styles.headerTitle, titleStyle]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
        </View>

        {rightElement ? (
          <View style={styles.rightGroup}>{rightElement}</View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 0,
    paddingRight: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  leftGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  backBtn: {
    marginLeft: 4,
    marginRight: 6,
  },
  headerTitle: {
    fontWeight: '600',
    fontSize: 18,
    color: '#000000',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
});

export default AppHeader;
