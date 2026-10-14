import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Wifi,
  Smartphone,
  RefreshCw,
  UploadCloud,
  LogOut,
  Check,
  X,
  Cloud,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react-native';
import { HapticService } from '../core/haptics';

export type BackupModalType =
  | 'network_pref'
  | 'sync_frequency'
  | 'account_options'
  | 'link_prompt';

interface CloudBackupModalProps {
  visible: boolean;
  type: BackupModalType | null;
  onClose: () => void;
  networkPref: 'any' | 'wifi_only';
  autoSync: 'off' | 'on_change';
  userEmail?: string;
  isLoading?: boolean;
  onSelectNetworkPref: (pref: 'any' | 'wifi_only') => void;
  onSelectSyncFrequency: (freq: 'off' | 'on_change') => void;
  onUnlinkAccount: () => void;
  onLinkAccount: () => void;
}

export const CloudBackupModal: React.FC<CloudBackupModalProps> = ({
  visible,
  type,
  onClose,
  networkPref,
  autoSync,
  userEmail,
  isLoading = false,
  onSelectNetworkPref,
  onSelectSyncFrequency,
  onUnlinkAccount,
  onLinkAccount,
}) => {
  if (!visible || !type) return null;

  const handleSelectNetwork = async (pref: 'any' | 'wifi_only') => {
    await HapticService.selection();
    onSelectNetworkPref(pref);
    onClose();
  };

  const handleSelectSync = async (freq: 'off' | 'on_change') => {
    await HapticService.selection();
    onSelectSyncFrequency(freq);
    onClose();
  };

  const handleUnlink = async () => {
    await HapticService.warning();
    onClose();
    setTimeout(() => {
      onUnlinkAccount();
    }, 150);
  };

  const handleLink = async () => {
    await HapticService.selection();
    onClose();
    setTimeout(() => {
      onLinkAccount();
    }, 150);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetContainer}>
              <SafeAreaView edges={['bottom']} style={styles.safeArea}>
                {/* Drag Indicator */}
                <View style={styles.indicatorContainer}>
                  <View style={styles.dragIndicator} />
                </View>

                {/* --- 1. NETWORK PREFERENCE MODAL --- */}
                {type === 'network_pref' && (
                  <>
                    <View style={styles.headerRow}>
                      <View style={styles.headerTextGroup}>
                        <Text style={styles.sheetTitle}>Back up over</Text>
                        <Text style={styles.sheetSubtitle}>
                          Choose which network connection to use for Google Drive backups
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <X color="#8E8E93" size={18} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.optionsList}>
                      {/* Wi-Fi or cellular */}
                      <TouchableOpacity
                        style={[
                          styles.optionCard,
                          networkPref === 'any' && styles.optionCardSelected,
                        ]}
                        onPress={() => handleSelectNetwork('any')}
                        activeOpacity={0.7}
                      >
                        <View style={styles.optionIconBox}>
                          <Smartphone color="#0F172A" size={20} />
                        </View>
                        <View style={styles.optionContent}>
                          <Text style={styles.optionTitle}>Wi-Fi or cellular</Text>
                          <Text style={styles.optionDesc}>
                            Back up anytime using cellular mobile data or Wi-Fi
                          </Text>
                        </View>
                        {networkPref === 'any' ? (
                          <View style={styles.checkPill}>
                            <Check color="#FFFFFF" size={14} strokeWidth={2.5} />
                          </View>
                        ) : (
                          <View style={styles.uncheckPill} />
                        )}
                      </TouchableOpacity>

                      {/* Wi-Fi only */}
                      <TouchableOpacity
                        style={[
                          styles.optionCard,
                          networkPref === 'wifi_only' && styles.optionCardSelected,
                        ]}
                        onPress={() => handleSelectNetwork('wifi_only')}
                        activeOpacity={0.7}
                      >
                        <View style={styles.optionIconBox}>
                          <Wifi color="#0F172A" size={20} />
                        </View>
                        <View style={styles.optionContent}>
                          <Text style={styles.optionTitle}>Wi-Fi only</Text>
                          <Text style={styles.optionDesc}>
                            Only back up when connected to an unmetered Wi-Fi network
                          </Text>
                        </View>
                        {networkPref === 'wifi_only' ? (
                          <View style={styles.checkPill}>
                            <Check color="#FFFFFF" size={14} strokeWidth={2.5} />
                          </View>
                        ) : (
                          <View style={styles.uncheckPill} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* --- 2. SYNC FREQUENCY MODAL --- */}
                {type === 'sync_frequency' && (
                  <>
                    <View style={styles.headerRow}>
                      <View style={styles.headerTextGroup}>
                        <Text style={styles.sheetTitle}>Back up to Google Drive</Text>
                        <Text style={styles.sheetSubtitle}>
                          Choose when your encrypted vault is uploaded to cloud storage
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <X color="#8E8E93" size={18} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.optionsList}>
                      {/* Auto-sync */}
                      <TouchableOpacity
                        style={[
                          styles.optionCard,
                          autoSync === 'on_change' && styles.optionCardSelected,
                        ]}
                        onPress={() => handleSelectSync('on_change')}
                        activeOpacity={0.7}
                      >
                        <View style={styles.optionIconBox}>
                          <RefreshCw color="#0F172A" size={20} />
                        </View>
                        <View style={styles.optionContent}>
                          <View style={styles.titleWithBadge}>
                            <Text style={styles.optionTitle}>Auto-sync on changes</Text>
                            <View style={styles.recBadge}>
                              <Text style={styles.recBadgeText}>RECOMMENDED</Text>
                            </View>
                          </View>
                          <Text style={styles.optionDesc}>
                            Silently updates Google Drive whenever vault items are added or modified
                          </Text>
                        </View>
                        {autoSync === 'on_change' ? (
                          <View style={styles.checkPill}>
                            <Check color="#FFFFFF" size={14} strokeWidth={2.5} />
                          </View>
                        ) : (
                          <View style={styles.uncheckPill} />
                        )}
                      </TouchableOpacity>

                      {/* Manual */}
                      <TouchableOpacity
                        style={[
                          styles.optionCard,
                          autoSync === 'off' && styles.optionCardSelected,
                        ]}
                        onPress={() => handleSelectSync('off')}
                        activeOpacity={0.7}
                      >
                        <View style={styles.optionIconBox}>
                          <UploadCloud color="#0F172A" size={20} />
                        </View>
                        <View style={styles.optionContent}>
                          <Text style={styles.optionTitle}>Only when I tap "Back Up"</Text>
                          <Text style={styles.optionDesc}>
                            Manual uploads only; never syncs in the background
                          </Text>
                        </View>
                        {autoSync === 'off' ? (
                          <View style={styles.checkPill}>
                            <Check color="#FFFFFF" size={14} strokeWidth={2.5} />
                          </View>
                        ) : (
                          <View style={styles.uncheckPill} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* --- 3. GOOGLE ACCOUNT OPTIONS MODAL --- */}
                {type === 'account_options' && (
                  <>
                    <View style={styles.headerRow}>
                      <View style={styles.headerTextGroup}>
                        <Text style={styles.sheetTitle}>Google Account</Text>
                        <Text style={styles.sheetSubtitle}>
                          Manage the Google account linked to btw vault
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <X color="#8E8E93" size={18} />
                      </TouchableOpacity>
                    </View>

                    {/* Account Info Pill */}
                    <View style={styles.accountBanner}>
                      <View style={styles.accountIconBox}>
                        <Cloud color="#0F172A" size={20} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.accountEmail} numberOfLines={1}>
                          {userEmail || 'Connected Google Account'}
                        </Text>
                        <Text style={styles.accountFolder}>Stored in hidden appDataFolder</Text>
                      </View>
                      <View style={styles.connectedBadge}>
                        <ShieldCheck color="#15803D" size={12} style={{ marginRight: 3 }} />
                        <Text style={styles.connectedBadgeText}>LINKED</Text>
                      </View>
                    </View>

                    <View style={styles.optionsList}>
                      {/* Unlink Account */}
                      <TouchableOpacity
                        style={[styles.optionCard, styles.optionCardDanger]}
                        onPress={handleUnlink}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.optionIconBox, styles.dangerIconBox]}>
                          <LogOut color="#DC2626" size={19} />
                        </View>
                        <View style={styles.optionContent}>
                          <Text style={styles.dangerTitle}>Unlink Google Drive</Text>
                          <Text style={styles.optionDesc}>
                            Disconnect cloud sync; existing backups remain safe
                          </Text>
                        </View>
                        <ChevronRight color="#FCA5A5" size={18} />
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* --- 4. LINK ACCOUNT INTRO PROMPT --- */}
                {type === 'link_prompt' && (
                  <>
                    <View style={styles.headerRow}>
                      <View style={styles.headerTextGroup}>
                        <Text style={styles.sheetTitle}>Link Google Drive</Text>
                        <Text style={styles.sheetSubtitle}>
                          Encrypted cloud backup with zero-knowledge security
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <X color="#8E8E93" size={18} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.introBox}>
                      <View style={styles.introRow}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.introText}>
                          Your vault is encrypted with <Text style={styles.bold}>AES-256</Text> using your master password before uploading.
                        </Text>
                      </View>
                      <View style={styles.introRow}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.introText}>
                          Backups live in Google Drive's hidden <Text style={styles.bold}>appDataFolder</Text>—invisible to other apps.
                        </Text>
                      </View>
                      <View style={styles.introRow}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.introText}>
                          Restore your vault seamlessly whenever you switch to a new phone.
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.primaryActionButton}
                      onPress={handleLink}
                      disabled={isLoading}
                      activeOpacity={0.85}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Cloud color="#FFFFFF" size={18} style={{ marginRight: 8 }} />
                          <Text style={styles.primaryActionText}>Connect Google Account</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cancelLink}
                      onPress={onClose}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.cancelLinkText}>Not Now</Text>
                    </TouchableOpacity>
                  </>
                )}
              </SafeAreaView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  safeArea: {
    width: '100%',
  },
  indicatorContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  headerTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsList: {
    paddingVertical: 14,
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  optionCardSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#0F172A',
  },
  optionCardDanger: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dangerIconBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FECACA',
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
    letterSpacing: -0.2,
  },
  optionDesc: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 17,
  },
  recBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  recBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0284C7',
    letterSpacing: 0.4,
  },
  checkPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uncheckPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  accountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  accountIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  accountEmail: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  accountFolder: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  connectedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: 0.4,
  },
  introBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  introRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0F172A',
    marginTop: 6,
  },
  introText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  bold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    height: 50,
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
});
