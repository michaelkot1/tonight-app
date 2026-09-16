import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextInput } from '@/components/text-input';
import { ThemedText } from '@/components/themed-text';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import { colors, spacing } from '@/theme';

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/** Collects the 6-digit signup OTP emailed via SMTP after Create account. */
export function ConfirmEmailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = useMemo(
    () => firstParam(params.email).trim(),
    [params.email],
  );

  const { isConfigured, verifyEmailOtp, resendConfirmationEmail } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const digits = code.replace(/\D/g, '').slice(0, 6);
  const canSubmit =
    isConfigured && email.length > 0 && digits.length === 6 && !submitting;

  async function handleVerify() {
    if (!canSubmit) return;
    setError(null);
    setInfo(null);
    setSubmitting(true);
    const { error: verifyError } = await verifyEmailOtp(email, digits);
    setSubmitting(false);
    if (verifyError) {
      setError(verifyError);
      return;
    }
    // Session is set by verifyOtp → root guard sends user into onboarding/tabs.
  }

  async function handleResend() {
    if (!isConfigured || !email || submitting) return;
    setError(null);
    setSubmitting(true);
    const { error: resendError } = await resendConfirmationEmail(email);
    setSubmitting(false);
    if (resendError) {
      setError(resendError);
      return;
    }
    setInfo(`New code sent to ${email}.`);
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.shell, colors.bg, colors.bg]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.bloomGreen} pointerEvents="none" />
      <View style={styles.bloomPurple} pointerEvents="none" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + spacing.header,
              paddingBottom: insets.bottom + spacing.xxxl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText variant="heroTitle">Enter your code</ThemedText>
            <ThemedText variant="metadata" style={styles.subtitle}>
              {email
                ? `We sent a 6-digit code to ${email}. Enter it below to confirm your account.`
                : 'We sent a 6-digit code to your email. Enter it below to confirm your account.'}
            </ThemedText>
          </View>

          <View style={styles.form}>
            <TextInput
              label="Confirmation code"
              value={digits}
              onChangeText={(text) => {
                setCode(text.replace(/\D/g, '').slice(0, 6));
                setError(null);
              }}
              placeholder="000000"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              editable={isConfigured}
              error={error ?? undefined}
              helper={info ?? undefined}
            />
            <Button
              label="Confirm account"
              onPress={handleVerify}
              disabled={!canSubmit}
              loading={submitting}
            />
            <Button
              label="Resend code"
              variant="secondary"
              onPress={handleResend}
              disabled={!isConfigured || !email || submitting}
              loading={submitting}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(routes.auth)}
            style={styles.toggle}
          >
            <ThemedText variant="caption" style={styles.toggleText}>
              Use a different email
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  bloomGreen: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.ambientGreen,
    opacity: 0.12,
  },
  bloomPurple: {
    position: 'absolute',
    bottom: '18%',
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.ambientPurple,
    opacity: 0.85,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.inset,
    justifyContent: 'center',
    gap: spacing.rail,
  },
  header: {
    gap: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
  },
  form: {
    gap: spacing.lg,
  },
  toggle: {
    alignItems: 'center',
  },
  toggleText: {
    color: colors.textMuted,
  },
});
