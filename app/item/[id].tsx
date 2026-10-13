import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react-native';
import { VaultItem } from '../../src/types';
import { GoogleKeepNoteEditor } from '../../src/components/GoogleKeepNoteEditor';
import { useVault } from '../../src/context/VaultContext';
import { ClipboardService } from '../../src/core/security/clipboardService';
import { getItemBadgeTheme } from '../../src/theme/categoryColors';
import { CreditCardView } from '../../src/components/CreditCardView';
import { HapticService } from '../../src/core/haptics';
import { useSensitiveAuth } from '../../src/components/SensitiveAuthModal';

function getPasswordStrength(pass?: string) {
  if (!pass) return { score: 0, label: 'Empty', color: '#8E8E93' };
  let score = 0;
  if (pass.length >= 8) score++;
  if (pass.length >= 12) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: '#FF3B30' };
  if (score === 2) return { score: 2, label: 'Fair', color: '#FF9500' };
  if (score === 3) return { score: 3, label: 'Strong', color: '#34C759' };
  return { score: 4, label: 'Fantastic', color: '#30D158' };
}

function parseUrlDisplay(rawUrl?: string) {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  const match = trimmed.match(/^(https?:\/\/)?([^\/\s]+)(.*)?$/i);
  if (!match) return { prefix: '', domain: trimmed, path: '' };
  return {
    prefix: match[1] || '',
    domain: match[2] || '',
    path: match[3] || '',
  };
}

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, deleteItem, updateItem, isLoading } = useVault();
  const router = useRouter();

  const item = items.find((i) => i.id === id);

  const { requireAuth, AuthModal } = useSensitiveAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showHiddenField, setShowHiddenField] = useState<{ [key: string]: boolean }>({});

  if (!item) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Vault item not found</Text>
      </View>
    );
  }

  // GOOGLE KEEP NOTE EXPERIENCE: Direct canvas view & edit, zero form scaffolding
  if (item.category === 'note' || item.category === 'other') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <GoogleKeepNoteEditor
          mode="edit"
          initialData={{
            title: item.title,
            notes: item.notes || '',
            tags: item.tags || [],
            isPinned: item.isPinned || false,
            color: item.color,
          }}
          updatedAt={item.updatedAt}
          isLoading={isLoading}
          onSave={async (data) => {
            const updatedItem: VaultItem = {
              ...item,
              title: data.title,
              notes: data.notes,
              tags: data.tags,
              isPinned: data.isPinned,
              color: data.color,
              updatedAt: new Date().toISOString(),
            };
            const success = await updateItem(updatedItem);
            if (success) {
              await HapticService.success();
              router.back();
            }
          }}
          onBack={() => {
            router.back();
          }}
          onDelete={() => {
            Alert.alert(
              'Delete Note',
              `Are you sure you want to delete "${item.title}"?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await HapticService.warning();
                    await deleteItem(item.id);
                    router.back();
                  },
                },
              ]
            );
          }}
        />
      </>
    );
  }

  const handleCopy = async (text: string, label: string) => {
    await ClipboardService.copyWithAutoClear(text, 30);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleTogglePassword = async () => {
    if (showPassword) {
      HapticService.selection();
      setShowPassword(false);
      return;
    }
    const ok = await requireAuth('Authenticate to reveal password');
    if (ok) {
      setShowPassword(true);
    }
  };

  const handleCopyPassword = async () => {
    if (!item.password) return;
    if (!showPassword) {
      const ok = await requireAuth('Authenticate to copy password');
      if (!ok) return;
    }
    await handleCopy(item.password, 'password');
  };

  const handleToggleHiddenField = async (cfId: string) => {
    if (showHiddenField[cfId]) {
      HapticService.selection();
      setShowHiddenField((prev) => ({ ...prev, [cfId]: false }));
      return;
    }
    const ok = await requireAuth('Authenticate to reveal hidden field');
    if (ok) {
      setShowHiddenField((prev) => ({ ...prev, [cfId]: true }));
    }
  };

  const handleCopyCustomField = async (cf: any) => {
    if (!cf.value) return;
    if (cf.type === 'hidden' && !showHiddenField[cf.id]) {
      const ok = await requireAuth(`Authenticate to copy ${cf.label || 'hidden field'}`);
      if (!ok) return;
    }
    await handleCopy(cf.value, `cf_${cf.id}`);
  };

  const handleOpenUrl = async (urlToOpen: string) => {
    try {
      let formatted = urlToOpen.trim();
      if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
        formatted = `https://${formatted}`;
      }
      await Linking.openURL(formatted);
    } catch {
      Alert.alert('Could Not Open', 'The provided URL could not be opened.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.title}" from your vault?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await HapticService.warning();
            await deleteItem(item.id);
            router.back();
          },
        },
      ]
    );
  };

  const theme = getItemBadgeTheme(item);
  const IconComponent = theme.icon;
  const passStrength = getPasswordStrength(item.password);

  return (
    <>
      <Stack.Screen
        options={{
          title: item.title,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/item/edit/${item.id}`)}
              style={styles.headerEditBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Text style={styles.headerEditText}>Edit</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* TOAST / CLIPBOARD AUTO-CLEAR NOTICE */}
        {copiedField ? (
          <View style={styles.clipboardBanner}>
            <View style={styles.clipboardBannerDot} />
            <Text style={styles.clipboardBannerText}>
              Copied to clipboard • Clears automatically in 30s
            </Text>
          </View>
        ) : null}

        {/* 1. COMPACT 1PASSWORD HEADER (Icon + Title side by side) */}
        {item.category === 'card' && item.cardDetails ? (
          <CreditCardView
            item={item}
            cardDetails={item.cardDetails}
            title={item.title}
            onRequireAuth={requireAuth}
            onCopied={(label) => setCopiedField(label)}
          />
        ) : (
          <View style={styles.headerRow}>
            <View
              style={[
                styles.headerIconSquircle,
                { backgroundColor: item.category === 'login' ? '#FFF4D6' : theme.bgTint },
              ]}
            >
              <IconComponent
                color={item.category === 'login' ? '#D48806' : theme.color}
                size={28}
                strokeWidth={2.4}
              />
            </View>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
          </View>
        )}

        {/* 2. LOGIN CREDENTIALS & SITES (1Password Grouped Inset Style) */}
        {item.category === 'login' && (
          <>
            {/* CREDENTIALS GROUPED CARD */}
            {(item.username || item.password) && (
              <View style={styles.groupedCard}>
                {item.username ? (
                  <View style={styles.groupedRow}>
                    <Text style={styles.rowLabelPurple}>username</Text>
                    <View style={styles.rowContentLine}>
                      <TouchableOpacity
                        style={styles.rowValueTouchable}
                        onPress={() => handleCopy(item.username!, 'username')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.rowValueText} selectable>
                          {item.username}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.rowActionBtn,
                          copiedField === 'username' && styles.rowActionBtnSuccess,
                        ]}
                        onPress={() => handleCopy(item.username!, 'username')}
                        hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
                        activeOpacity={0.6}
                      >
                        {copiedField === 'username' ? (
                          <Check color="#34C759" size={17} strokeWidth={2.6} />
                        ) : (
                          <Copy color="#8E8E93" size={17} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {item.username && item.password ? <View style={styles.rowSeparator} /> : null}

                {item.password ? (
                  <View style={styles.groupedRow}>
                    <Text style={styles.rowLabelPurple}>password</Text>
                    <View style={styles.rowContentLine}>
                      <TouchableOpacity
                        style={styles.rowValueTouchable}
                        onPress={handleCopyPassword}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.rowValueText,
                            !showPassword && styles.maskedPasswordText,
                            showPassword && styles.monoPasswordText,
                          ]}
                          selectable={showPassword}
                        >
                          {showPassword ? item.password : '••••••••••••'}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.rowRightActionsGroup}>
                        {/* 1Password Strength Gauge */}
                        <View style={styles.strengthIndicatorGroup}>
                          <Text
                            style={[
                              styles.strengthIndicatorText,
                              { color: passStrength.color },
                            ]}
                          >
                            {passStrength.label}
                          </Text>
                          <View
                            style={[
                              styles.strengthRing,
                              { borderColor: passStrength.color },
                            ]}
                          />
                        </View>

                        <TouchableOpacity
                          onPress={handleTogglePassword}
                          style={styles.rowActionBtn}
                          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                          activeOpacity={0.6}
                        >
                          {showPassword ? (
                            <EyeOff color="#8E8E93" size={17} />
                          ) : (
                            <Eye color="#8E8E93" size={17} />
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={handleCopyPassword}
                          style={[
                            styles.rowActionBtn,
                            copiedField === 'password' && styles.rowActionBtnSuccess,
                          ]}
                          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                          activeOpacity={0.6}
                        >
                          {copiedField === 'password' ? (
                            <Check color="#34C759" size={17} strokeWidth={2.6} />
                          ) : (
                            <Copy color="#8E8E93" size={17} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : null}
              </View>
            )}

            {/* WEBSITES GROUPED CARD */}
            {(item.url || (item.additionalUrls && item.additionalUrls.length > 0)) && (
              <View style={styles.groupedCard}>
                {item.url ? (
                  <View style={styles.groupedRow}>
                    <Text style={styles.rowLabelPurple}>website</Text>
                    <View style={styles.rowContentLine}>
                      <TouchableOpacity
                        style={styles.rowValueTouchable}
                        onPress={() => handleOpenUrl(item.url!)}
                        activeOpacity={0.7}
                      >
                        {(() => {
                          const parts = parseUrlDisplay(item.url);
                          return (
                            <Text style={styles.rowValueText} numberOfLines={1}>
                              {parts?.prefix ? (
                                <Text style={styles.urlPrefixMuted}>{parts.prefix}</Text>
                              ) : null}
                              <Text style={styles.urlDomainBlue}>{parts?.domain}</Text>
                              {parts?.path ? (
                                <Text style={styles.urlPathMuted}>{parts.path}</Text>
                              ) : null}
                            </Text>
                          );
                        })()}
                      </TouchableOpacity>
                      <View style={styles.rowRightActionsGroup}>
                        <TouchableOpacity
                          onPress={() => handleOpenUrl(item.url!)}
                          style={styles.rowActionBtn}
                          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                          activeOpacity={0.6}
                        >
                          <ExternalLink color="#007AFF" size={17} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleCopy(item.url!, 'url')}
                          style={[
                            styles.rowActionBtn,
                            copiedField === 'url' && styles.rowActionBtnSuccess,
                          ]}
                          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                          activeOpacity={0.6}
                        >
                          {copiedField === 'url' ? (
                            <Check color="#34C759" size={17} strokeWidth={2.6} />
                          ) : (
                            <Copy color="#8E8E93" size={17} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : null}

                {item.additionalUrls &&
                  item.additionalUrls.map((extraUrl, idx) => (
                    <View key={idx}>
                      <View style={styles.rowSeparator} />
                      <View style={styles.groupedRow}>
                        <Text style={styles.rowLabelPurple}>{`website ${idx + 2}`}</Text>
                        <View style={styles.rowContentLine}>
                          <TouchableOpacity
                            style={styles.rowValueTouchable}
                            onPress={() => handleOpenUrl(extraUrl)}
                            activeOpacity={0.7}
                          >
                            {(() => {
                              const parts = parseUrlDisplay(extraUrl);
                              return (
                                <Text style={styles.rowValueText} numberOfLines={1}>
                                  {parts?.prefix ? (
                                    <Text style={styles.urlPrefixMuted}>{parts.prefix}</Text>
                                  ) : null}
                                  <Text style={styles.urlDomainBlue}>{parts?.domain}</Text>
                                  {parts?.path ? (
                                    <Text style={styles.urlPathMuted}>{parts.path}</Text>
                                  ) : null}
                                </Text>
                              );
                            })()}
                          </TouchableOpacity>
                          <View style={styles.rowRightActionsGroup}>
                            <TouchableOpacity
                              onPress={() => handleOpenUrl(extraUrl)}
                              style={styles.rowActionBtn}
                              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                              activeOpacity={0.6}
                            >
                              <ExternalLink color="#007AFF" size={17} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleCopy(extraUrl, `extra_${idx}`)}
                              style={[
                                styles.rowActionBtn,
                                copiedField === `extra_${idx}` && styles.rowActionBtnSuccess,
                              ]}
                              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                              activeOpacity={0.6}
                            >
                              {copiedField === `extra_${idx}` ? (
                                <Check color="#34C759" size={17} strokeWidth={2.6} />
                              ) : (
                                <Copy color="#8E8E93" size={17} />
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
              </View>
            )}

            {/* NOTES GROUPED CARD FOR LOGIN */}
            {item.notes ? (
              <View style={styles.groupedCard}>
                <View style={styles.groupedRow}>
                  <View style={styles.rowLabelBetween}>
                    <Text style={styles.rowLabelPurple}>notes</Text>
                    <TouchableOpacity
                      onPress={() => handleCopy(item.notes!, 'notes')}
                      style={[
                        styles.rowActionBtn,
                        copiedField === 'notes' && styles.rowActionBtnSuccess,
                      ]}
                      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                      activeOpacity={0.6}
                    >
                      {copiedField === 'notes' ? (
                        <Check color="#34C759" size={16} strokeWidth={2.6} />
                      ) : (
                        <Copy color="#8E8E93" size={16} />
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.notesText}>{item.notes}</Text>
                </View>
              </View>
            ) : null}
          </>
        )}


        {/* 4. CARD NOTES BLOCK */}
        {item.category === 'card' && item.notes ? (
          <View style={styles.groupedCard}>
            <View style={styles.groupedRow}>
              <View style={styles.rowLabelBetween}>
                <Text style={styles.rowLabelPurple}>notes</Text>
                <TouchableOpacity
                  onPress={() => handleCopy(item.notes!, 'notes')}
                  style={[
                    styles.rowActionBtn,
                    copiedField === 'notes' && styles.rowActionBtnSuccess,
                  ]}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  activeOpacity={0.6}
                >
                  {copiedField === 'notes' ? (
                    <Check color="#34C759" size={16} strokeWidth={2.6} />
                  ) : (
                    <Copy color="#8E8E93" size={16} />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          </View>
        ) : null}


        {/* 6. CUSTOM FIELDS */}
        {item.customFields && item.customFields.length > 0 && (
          <View style={styles.groupedCard}>
            {item.customFields.map((cf, idx) => {
              const isHidden = cf.type === 'hidden';
              const isVisible = showHiddenField[cf.id];
              const isLink = cf.type === 'url' || cf.type === 'link';
              const isEmail = cf.type === 'email';

              return (
                <View key={cf.id || idx}>
                  {idx > 0 && <View style={styles.rowSeparator} />}
                  <View style={styles.groupedRow}>
                    <Text style={styles.rowLabelPurple}>
                      {(cf.label || cf.type).toLowerCase()}
                    </Text>
                    <View style={styles.rowContentLine}>
                      <TouchableOpacity
                        style={styles.rowValueTouchable}
                        onPress={() => {
                          if (isLink && cf.value) handleOpenUrl(cf.value);
                          else if (isEmail && cf.value) Linking.openURL(`mailto:${cf.value}`);
                          else if (cf.value) handleCopyCustomField(cf);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.rowValueText,
                            isHidden && styles.maskedPasswordText,
                            (isLink || isEmail) && styles.urlDomainBlue,
                          ]}
                          selectable
                        >
                          {isHidden ? (isVisible ? cf.value : '••••••••••••') : cf.value || '—'}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.rowRightActionsGroup}>
                        {isHidden && (
                          <TouchableOpacity
                            onPress={() => handleToggleHiddenField(cf.id)}
                            style={styles.rowActionBtn}
                            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                            activeOpacity={0.6}
                          >
                            {isVisible ? (
                              <EyeOff color="#8E8E93" size={17} />
                            ) : (
                              <Eye color="#8E8E93" size={17} />
                            )}
                          </TouchableOpacity>
                        )}

                        {isLink && cf.value ? (
                          <TouchableOpacity
                            onPress={() => handleOpenUrl(cf.value)}
                            style={styles.rowActionBtn}
                            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                            activeOpacity={0.6}
                          >
                            <ExternalLink color="#007AFF" size={17} />
                          </TouchableOpacity>
                        ) : null}

                        {isEmail && cf.value ? (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(`mailto:${cf.value}`)}
                            style={styles.rowActionBtn}
                            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                            activeOpacity={0.6}
                          >
                            <ExternalLink color="#007AFF" size={17} />
                          </TouchableOpacity>
                        ) : null}

                        {cf.value ? (
                          <TouchableOpacity
                            onPress={() => handleCopyCustomField(cf)}
                            style={[
                              styles.rowActionBtn,
                              copiedField === `cf_${cf.id}` && styles.rowActionBtnSuccess,
                            ]}
                            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                            activeOpacity={0.6}
                          >
                            {copiedField === `cf_${cf.id}` ? (
                              <Check color="#34C759" size={17} strokeWidth={2.6} />
                            ) : (
                              <Copy color="#8E8E93" size={17} />
                            )}
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* 7. TAGS */}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            <View style={styles.tagsList}>
              {item.tags.map((tag) => (
                <View key={tag} style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 8. DELETE ITEM */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.6}
          >
            <Trash2 color="#FF3B30" size={17} style={{ marginRight: 6 }} />
            <Text style={styles.deleteBtnText}>Delete Item</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {AuthModal}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
  },
  notFoundContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    color: '#8E8E93',
    fontSize: 16,
  },

  // Native Header Edit Pill
  headerEditBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  headerEditText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Auto-clear Notice Banner
  clipboardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.25)',
  },
  clipboardBannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
    marginRight: 8,
  },
  clipboardBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E7E34',
  },

  // 1Password Compact Header (Icon + Title side by side)
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  headerIconSquircle: {
    width: 56,
    height: 56,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.4,
  },

  // 1Password Inset Grouped Card
  groupedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  groupedRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginLeft: 16,
  },
  rowLabelPurple: {
    fontSize: 13,
    fontWeight: '500',
    color: '#5856D6', // 1Password soft violet
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  rowLabelBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowContentLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  rowValueTouchable: {
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
  },
  rowValueText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  maskedPasswordText: {
    fontSize: 18,
    color: '#1C1C1E',
    letterSpacing: 2,
  },
  monoPasswordText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 15,
  },
  rowRightActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowActionBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowActionBtnSuccess: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
  },

  // 1Password Strength Gauge
  strengthIndicatorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
    gap: 6,
  },
  strengthIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  strengthRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
  },

  // 1Password URL Styling
  urlPrefixMuted: {
    color: '#8E8E93',
  },
  urlDomainBlue: {
    color: '#007AFF',
    fontWeight: '500',
  },
  urlPathMuted: {
    color: '#8E8E93',
  },

  // Notes
  notesText: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 22,
    fontWeight: '400',
  },

  // Tags
  tagsContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBadge: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagBadgeText: {
    fontSize: 13,
    color: '#3A3A3C',
    fontWeight: '500',
  },

  // Delete Action
  actionsContainer: {
    marginTop: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  deleteBtnText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '600',
  },
});
