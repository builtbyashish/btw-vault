import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useVault } from '../../src/context/VaultContext';
import { useRouter } from 'expo-router';

import { getItemBadgeTheme } from '../../src/theme/categoryColors';

export default function WatchtowerScreen() {
  const { items } = useVault();
  const router = useRouter();

  // Compute vault stats dynamically from items
  const totalItems = items.length;
  const weakPasswords = items.filter(
    (i) => i.password && i.password.length < 8
  );
  const reusedPasswords = items.filter((i, idx, self) =>
    i.password && self.some((other, oIdx) => oIdx !== idx && other.password === i.password)
  );
  
  // Calculate dynamic security score (base 100)
  let score = 100;
  if (totalItems > 0) {
    const weakPenalty = (weakPasswords.length / totalItems) * 40;
    const reusePenalty = (reusedPasswords.length / totalItems) * 40;
    score = Math.max(15, Math.round(100 - weakPenalty - reusePenalty));
  }

  const getScoreColor = (val: number) => {
    if (val >= 80) return '#34C759'; // Success
    if (val >= 60) return '#FF9500'; // Warning
    return '#FF3B30'; // Danger
  };

  const scoreColor = getScoreColor(score);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      <View style={styles.card}>
        <View style={styles.scoreSection}>
          <Text style={styles.scoreValue}>{score}</Text>
          <Text style={styles.scoreLabel}>Security Score</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${score}%`, backgroundColor: scoreColor }]} />
          </View>
        </View>

        <View style={styles.statsSection}>
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{weakPasswords.length}</Text>
            <Text style={styles.statLabel}>Weak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{reusedPasswords.length}</Text>
            <Text style={styles.statLabel}>Reused</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Recommendations</Text>
      <View style={styles.card}>
        {weakPasswords.length === 0 && reusedPasswords.length === 0 ? (
          <View style={styles.row}>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Looking Good</Text>
              <Text style={styles.rowSubtitle}>No weak or reused passwords detected.</Text>
            </View>
          </View>
        ) : (
          <>
            {weakPasswords.length > 0 && (
              <TouchableOpacity
                style={styles.row}
                onPress={() => {
                  if (weakPasswords[0]) router.push(`/item/${weakPasswords[0].id}`);
                }}
                activeOpacity={0.5}
              >
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>Update Weak Passwords</Text>
                  <Text style={styles.rowSubtitle}>{weakPasswords.length} items have passwords under 8 characters.</Text>
                </View>
                <ChevronRight color="#C7C7CC" size={20} />
              </TouchableOpacity>
            )}
            {weakPasswords.length > 0 && reusedPasswords.length > 0 && (
              <View style={styles.rowSeparator} />
            )}
            {reusedPasswords.length > 0 && (
              <TouchableOpacity
                style={styles.row}
                onPress={() => {
                  if (reusedPasswords[0]) router.push(`/item/${reusedPasswords[0].id}`);
                }}
                activeOpacity={0.5}
              >
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>Change Reused Passwords</Text>
                  <Text style={styles.rowSubtitle}>{reusedPasswords.length} items use duplicate passwords.</Text>
                </View>
                <ChevronRight color="#C7C7CC" size={20} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      <Text style={styles.sectionHeader}>Vault Items</Text>
      <View style={styles.card}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Vault is empty</Text>
          </View>
        ) : (
          items.map((item, index) => {
            const isWeak = !!(item.password && item.password.length < 8);
            const isReused = !!(
              item.password && items.some((o) => o.id !== item.id && o.password === item.password)
            );

            const itemBadge = getItemBadgeTheme(item);
            const IconComponent = itemBadge.icon;

            return (
              <React.Fragment key={item.id}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => router.push(`/item/${item.id}`)}
                  activeOpacity={0.5}
                >
                  <View style={[styles.itemIcon, { backgroundColor: itemBadge.color }]}>
                    <IconComponent color="#FFFFFF" size={16} />
                  </View>

                  <View style={styles.rowContent}>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowSubtitle}>{item.username || 'No username'}</Text>
                  </View>

                  <View style={styles.badgeContainer}>
                    {isWeak || isReused ? (
                      <View style={[styles.badge, isWeak ? styles.badgeDanger : styles.badgeWarning]}>
                        <Text style={[styles.badgeText, isWeak ? styles.badgeDangerText : styles.badgeWarningText]}>
                          {isWeak ? 'Weak' : 'Reused'}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, styles.badgeSuccess]}>
                        <Text style={[styles.badgeText, styles.badgeSuccessText]}>Secure</Text>
                      </View>
                    )}
                    <ChevronRight color="#C7C7CC" size={20} style={styles.chevron} />
                  </View>
                </TouchableOpacity>
                {index < items.length - 1 && <View style={styles.rowSeparator} />}
              </React.Fragment>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  scoreSection: {
    padding: 24,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 16,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E5EA',
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  statsSection: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  statCol: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  sectionHeader: {
    fontSize: 13,
    textTransform: 'uppercase',
    color: '#8E8E93',
    marginBottom: 8,
    marginLeft: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginLeft: 16,
  },
  rowContent: {
    flex: 1,
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 17,
    color: '#000000',
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  badgeDanger: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  badgeDangerText: {
    color: '#FF3B30',
  },
  badgeWarning: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
  },
  badgeWarningText: {
    color: '#FF9500',
  },
  badgeSuccess: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  badgeSuccessText: {
    color: '#34C759',
  },
  chevron: {
    marginLeft: 8,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
});
