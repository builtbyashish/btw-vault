import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { AppHeader } from '../src/components/AppHeader';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  CreditCard,
  StickyNote,
  SlidersHorizontal,
  Cloud,
  CheckCircle2,
  ExternalLink,
  Linkedin,
  EyeOff,
  Cpu,
  Smartphone,
  ChevronRight,
  Shield,
  ArrowRight,
} from 'lucide-react-native';
import { BtwVaultLogo } from '../src/components/BtwVaultLogo';
import { HapticService } from '../src/core/haptics';

export default function AboutScreen() {
  const router = useRouter();

  const handleOpenLinkedIn = async () => {
    HapticService.selection();
    const url = 'https://www.linkedin.com/in/offical-ashish/';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title="About btw vault" onBack={() => router.back()} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      {/* 1. BRAND HERO */}
      <View style={styles.heroCard}>
        <View style={styles.heroLogoWrap}>
          <BtwVaultLogo size={36} />
        </View>
        <Text style={styles.heroTagline}>
          Zero-Knowledge Personal Cryptographic Vault
        </Text>
        <View style={styles.versionBadge}>
          <ShieldCheck color="#10B981" size={13} style={{ marginRight: 5 }} />
          <Text style={styles.versionBadgeText}>v1.3.0 • Offline-First • SQLCipher AES-256</Text>
        </View>
      </View>

      {/* 2. HOW IT WORKS (UNDER THE HOOD) */}
      <Text style={styles.sectionHeader}>HOW IT WORKS (UNDER THE HOOD)</Text>
      <View style={styles.card}>
        {/* Step 1 */}
        <View style={styles.stepItem}>
          <View style={[styles.stepIconBox, { backgroundColor: '#3B82F618' }]}>
            <Cpu size={18} color="#3B82F6" />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>1. Argon2id Memory-Hard Key Derivation</Text>
            <Text style={styles.stepDesc}>
              Your master password is never stored or transmitted anywhere. It is stretched using memory-hard Argon2id (4MB RAM, 2 iterations) with a cryptographically unique 256-bit salt to derive your 32-byte raw AES master key, neutralizing both GPU and ASIC dictionary attacks.
            </Text>
          </View>
        </View>

        <View style={styles.itemSeparator} />

        {/* Step 2 */}
        <View style={styles.stepItem}>
          <View style={[styles.stepIconBox, { backgroundColor: '#10B98118' }]}>
            <Lock size={18} color="#10B981" />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>2. SQLCipher Relational C++ JSI Engine</Text>
            <Text style={styles.stepDesc}>
              Every item, card, note, and custom category is stored in an encrypted SQLite database via native C++ JSI using SQLCipher (AES-256). Every page is individually encrypted on disk, delivering instant sub-millisecond point lookups and composite-indexed queries.
            </Text>
          </View>
        </View>

        <View style={styles.itemSeparator} />

        {/* Step 3 */}
        <View style={styles.stepItem}>
          <View style={[styles.stepIconBox, { backgroundColor: '#8B5CF618' }]}>
            <ShieldCheck size={18} color="#8B5CF6" />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>3. Budget Phone Tuning & Zero-Locking WAL</Text>
            <Text style={styles.stepDesc}>
              Write-Ahead Logging (WAL) ensures writes never block reads or cause UI frame drops. A strict 2MB RAM page cache ceiling prevents Out-Of-Memory kills on budget Android phones, while PRAGMA synchronous=NORMAL minimizes eMMC flash memory wear.
            </Text>
          </View>
        </View>

        <View style={styles.itemSeparator} />

        {/* Step 4 */}
        <View style={styles.stepItem}>
          <View style={[styles.stepIconBox, { backgroundColor: '#F59E0B18' }]}>
            <EyeOff size={18} color="#F59E0B" />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>4. Zero-Locking Snapshots & Hardware KeyStore</Text>
            <Text style={styles.stepDesc}>
              Cloud sync and backups use atomic VACUUM INTO snapshots with zero table locking. Hardware biometrics (Android BiometricPrompt) protect quick unlocking, secrets automatically wipe from memory, and clipboard auto-clears after 30 seconds.
            </Text>
          </View>
        </View>
      </View>

      {/* 3. GOOGLE DRIVE BACKUP & DEVICE LOSS RECOVERY */}
      <Text style={styles.sectionHeader}>GOOGLE DRIVE BACKUP & DEVICE LOSS</Text>
      <View style={styles.card}>
        {/* Scenario 1: Device Lost */}
        <View style={styles.recoveryHeroBanner}>
          <View style={styles.recoveryHeroIconBox}>
            <Smartphone size={20} color="#0284C7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recoveryHeroTitle}>What happens if your device is lost or stolen?</Text>
            <Text style={styles.recoveryHeroDesc}>
              Your data remains completely secure. The local vault database on the lost device is encrypted with AES-256-GCM. Without your Master Password, an attacker cannot extract or decrypt your credentials even if they have physical access to the device.
            </Text>
          </View>
        </View>

        <View style={styles.itemSeparator} />

        {/* Scenario 2: How to recover on a new device */}
        <Text style={styles.recoverySubHeading}>How to recover on your new replacement device:</Text>

        <View style={styles.recoveryStepRow}>
          <View style={styles.stepNumberBadge}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recoveryStepTitle}>Install btw vault on your new phone</Text>
            <Text style={styles.recoveryStepDesc}>
              Download and open the app on your replacement Android device.
            </Text>
          </View>
        </View>

        <View style={styles.recoveryStepRow}>
          <View style={styles.stepNumberBadge}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recoveryStepTitle}>Restore from Google Drive</Text>
            <Text style={styles.recoveryStepDesc}>
              On the setup screen, tap "Restore from Google Drive" (or select your exported .btw-vault backup file).
            </Text>
          </View>
        </View>

        <View style={styles.recoveryStepRow}>
          <View style={styles.stepNumberBadge}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recoveryStepTitle}>Enter your Master Password</Text>
            <Text style={styles.recoveryStepDesc}>
              Your phone verifies and decrypts the backup directly into your new secure sandbox. All passwords, cards, notes, custom categories, and tags are fully restored!
            </Text>
          </View>
        </View>

        <View style={styles.itemSeparator} />

        {/* Zero-Knowledge Cloud Guarantee */}
        <View style={styles.cloudSecurityNote}>
          <Cloud size={18} color="#0284C7" style={{ marginTop: 2, marginRight: 10 }} />
          <Text style={styles.cloudSecurityText}>
            <Text style={{ fontWeight: '700', color: '#0F172A' }}>Zero-Knowledge Cloud Guarantee: </Text>
            Your backup file is encrypted on your device <Text style={{ fontStyle: 'italic', fontWeight: '600' }}>before</Text> uploading to Google Drive. Google only holds raw, unreadable ciphertext. Google has zero access to your master password or encryption keys.
          </Text>
        </View>
      </View>

      {/* 4. WHAT WE OFFER */}
      <Text style={styles.sectionHeader}>WHAT WE OFFER</Text>
      <View style={styles.card}>
        <View style={styles.offerItem}>
          <View style={[styles.offerIconBox, { backgroundColor: '#007AFF15' }]}>
            <KeyRound size={18} color="#007AFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.offerTitle}>Logins & Credentials</Text>
            <Text style={styles.offerDesc}>
              Full password management with automatic username detection, custom secondary URLs, hidden tokens, and entropy-grade password generation.
            </Text>
          </View>
        </View>

        <View style={styles.itemSeparator} />

        <View style={styles.offerItem}>
          <View style={[styles.offerIconBox, { backgroundColor: '#10B98115' }]}>
            <CreditCard size={18} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.offerTitle}>Credit & Payment Cards</Text>
            <Text style={styles.offerDesc}>
              Live interactive cards with real-time brand detection (Visa, Mastercard, Amex, RuPay, Discover), Luhn algorithm checksum verification, and masked digits.
            </Text>
          </View>
        </View>

        <View style={styles.itemSeparator} />

        <View style={styles.offerItem}>
          <View style={[styles.offerIconBox, { backgroundColor: '#F59E0B15' }]}>
            <StickyNote size={18} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.offerTitle}>Canvas Notes (Google Keep Style)</Text>
            <Text style={styles.offerDesc}>
              Freeform open-canvas note taking with vibrant pastel colors, pinned priority items, and tag-based categorization.
            </Text>
          </View>
        </View>

        <View style={styles.itemSeparator} />

        <View style={styles.offerItem}>
          <View style={[styles.offerIconBox, { backgroundColor: '#8B5CF615' }]}>
            <SlidersHorizontal size={18} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.offerTitle}>Vault Customization & Playground</Text>
            <Text style={styles.offerDesc}>
              Create custom category schemas with custom field types: Dropdowns, Multi-Select tags, Date, Time, Secret Keys, and Quick Action bar pinning.
            </Text>
          </View>
        </View>

        <View style={styles.itemSeparator} />

        <View style={styles.offerItem}>
          <View style={[styles.offerIconBox, { backgroundColor: '#0284C715' }]}>
            <Cloud size={18} color="#0284C7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.offerTitle}>Encrypted Google Drive Sync</Text>
            <Text style={styles.offerDesc}>
              End-to-end encrypted cloud backups straight to your private Google Drive app folder. Direct device-to-cloud with zero proxy servers.
            </Text>
          </View>
        </View>
      </View>

      {/* 5. PRIVACY MANIFESTO */}
      <Text style={styles.sectionHeader}>PRIVACY MANIFESTO</Text>
      <View style={styles.manifestoCard}>
        <View style={styles.manifestoRow}>
          <CheckCircle2 size={16} color="#10B981" />
          <Text style={styles.manifestoText}>Zero trackers, telemetry, or analytics</Text>
        </View>
        <View style={styles.manifestoRow}>
          <CheckCircle2 size={16} color="#10B981" />
          <Text style={styles.manifestoText}>Zero account creation or phone number required</Text>
        </View>
        <View style={styles.manifestoRow}>
          <CheckCircle2 size={16} color="#10B981" />
          <Text style={styles.manifestoText}>100% functional without an internet connection</Text>
        </View>
        <View style={styles.manifestoRow}>
          <CheckCircle2 size={16} color="#10B981" />
          <Text style={styles.manifestoText}>Your keys and master password never leave your RAM</Text>
        </View>
      </View>

      {/* 6. VAULT CUSTOMIZATION */}
      <Text style={styles.sectionHeader}>VAULT CUSTOMIZATION</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => router.push('/categories')}
          activeOpacity={0.6}
        >
          <View style={[styles.actionIconBox, { backgroundColor: '#8B5CF615' }]}>
            <SlidersHorizontal size={17} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Vault Customization Playground</Text>
            <Text style={styles.actionSubtitle}>Manage category templates, dropdowns & action bar</Text>
          </View>
          <ChevronRight size={18} color="#C7C7CC" />
        </TouchableOpacity>
      </View>

      {/* 7. CREATOR & DEVELOPER (MOVED TO BOTTOM) */}
      <Text style={styles.sectionHeader}>CREATOR & DEVELOPER</Text>
      <View style={styles.card}>
        <View style={styles.creatorHeader}>
          <View style={styles.creatorAvatarBox}>
            <Text style={styles.creatorAvatarText}>AR</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.creatorName}>Ashish Ranjan</Text>
            <Text style={styles.creatorRole}>
              Software Engineer & Security Enthusiast
            </Text>
          </View>
        </View>

        <Text style={styles.creatorBio}>
          btw vault was conceived and built from the ground up by Ashish Ranjan with a relentless focus on uncompromised user privacy, military-grade local encryption, and frictionless modern design.
        </Text>

        <TouchableOpacity
          style={styles.linkedInButton}
          onPress={handleOpenLinkedIn}
          activeOpacity={0.8}
          accessibilityRole="link"
          accessibilityLabel="Connect with Ashish Ranjan on LinkedIn"
        >
          <View style={styles.linkedInIconWrap}>
            <Linkedin size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkedInTitle}>Ashish Ranjan on LinkedIn</Text>
            <Text style={styles.linkedInSub}>linkedin.com/in/offical-ashish</Text>
          </View>
          <ExternalLink size={16} color="#0A66C2" style={styles.linkedInExternalIcon} />
        </TouchableOpacity>
      </View>

      {/* 8. FOOTER */}
      <View style={styles.footer}>
        <View style={styles.footerHeartRow}>
          <Text style={styles.footerText}>Crafted with passion by </Text>
          <Text style={styles.footerAuthor}>Ashish Ranjan</Text>
        </View>
        <Text style={styles.footerSubText}>
          btw vault • Security by design • Zero compromises
        </Text>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  heroLogoWrap: {
    marginBottom: 6,
  },
  heroTagline: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 19,
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  versionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    letterSpacing: 0.3,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  creatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  creatorAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  creatorAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  creatorName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  creatorRole: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  creatorBio: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#334155',
    marginBottom: 16,
  },
  linkedInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
  },
  linkedInIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#0A66C2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  linkedInTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A66C2',
  },
  linkedInSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  linkedInExternalIcon: {
    marginLeft: 8,
  },
  stepItem: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  stepIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 18.5,
    color: '#475569',
  },
  itemSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  recoveryHeroBanner: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 12,
  },
  recoveryHeroIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  recoveryHeroTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 4,
  },
  recoveryHeroDesc: {
    fontSize: 12.5,
    lineHeight: 17.5,
    color: '#334155',
  },
  recoverySubHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  recoveryStepRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  recoveryStepTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  recoveryStepDesc: {
    fontSize: 12.5,
    lineHeight: 17,
    color: '#64748B',
  },
  cloudSecurityNote: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cloudSecurityText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#475569',
  },
  offerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  offerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  offerTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  offerDesc: {
    fontSize: 12.5,
    lineHeight: 17.5,
    color: '#64748B',
  },
  manifestoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  manifestoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  manifestoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  actionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  actionSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerHeartRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
  },
  footerAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  footerSubText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
});
