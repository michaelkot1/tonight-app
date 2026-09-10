import { useState } from 'react';
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
import { useAuth } from '@/providers/auth-provider';
import { colors, radius, spacing } from '@/theme';

type Mode = 'signIn' | 'signUp';
type Step = 'credentials' | 'checkEmail';

// TODO(oauth): Wire native Apple (expo-apple-authentication) + Google
// (expo-auth-session) sign-in. Handlers below are intentional no-op stubs so the
// buttons render disabled ("coming soon") until owner decisions land.
function handleAppleSignIn() {
  // Deferred — see Phase 2 "Deferred" scope.
}
function handleGoogleSignIn() {
  // Deferred — see Phase 2 "Deferred" scope.
}

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const {
    isConfigured,
    signInWithEmail,
    signUpWithEmail,
    resendConfirmationEmail,
  } = useAuth();

  const [mode, setMode] = useState<Mode>('signIn');
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === 'signUp';
  const trimmedEmail = email.trim();
  const canSubmit =
    isConfigured &&
    trimmedEmail.length > 0 &&
    password.length > 0 &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setInfo(null);
    setSubmitting(true);

    if (isSignUp) {
      const { error: authError, needsEmailConfirmation } =
        await signUpWithEmail(trimmedEmail, password);
      setSubmitting(false);
      if (authError) {
        setError(authError);
        return;
      }
      if (needsEmailConfirmation) {
        setStep('checkEmail');
        setInfo(null);
      }
      // If a session was returned (confirm-email off), the root guard redirects.
      return;
    }

    const { error: authError } = await signInWithEmail(trimmedEmail, password);
    setSubmitting(false);
    if (!authError) return;

    // Unconfirmed accounts can't sign in — point them back to their inbox.
    if (/not confirmed|confirm/i.test(authError)) {
      setStep('checkEmail');
      setError(null);
      setInfo('Please confirm your email first — check your inbox.');
      return;
    }
    setError(authError);
  }

  async function handleResend() {
    if (!isConfigured || !trimmedEmail || submitting) return;
    setError(null);
    setSubmitting(true);
    const { error: resendError } = await resendConfirmationEmail(trimmedEmail);
    setSubmitting(false);
    if (resendError) {
      setError(resendError);
      return;
    }
    setInfo(`New confirmation email sent to ${trimmedEmail}.`);
  }

  function toggleMode() {
    setMode(isSignUp ? 'signIn' : 'signUp');
    setStep('credentials');
    setError(null);
    setInfo(null);
  }

  function backToCredentials() {
    setStep('credentials');
    setError(null);
    setInfo(null);
  }

  if (step === 'checkEmail') {
    return (
      <View style={[styles.root, styles.centered]}>
        <View
          style={[
            styles.checkEmail,
            { paddingTop: insets.top + spacing.header },
          ]}
        >
          <ThemedText variant="heroTitle">Check your email</ThemedText>
          <ThemedText variant="metadata">
            We sent a confirmation link to {trimmedEmail}. Tap it on this device
            and we&apos;ll bring you right back to finish setting up.
          </ThemedText>
          {info ? (
            <ThemedText variant="caption" style={styles.infoText}>
              {info}
            </ThemedText>
          ) : null}
          {error ? (
            <ThemedText variant="caption" style={styles.errorText}>
              {error}
            </ThemedText>
          ) : null}
          <View style={styles.form}>
            <Button
              label="Resend confirmation email"
              variant="secondary"
              onPress={handleResend}
              disabled={!isConfigured || submitting}
              loading={submitting}
            />
            <Pressable
              accessibilityRole="button"
              onPress={backToCredentials}
              style={styles.toggle}
            >
              <ThemedText variant="caption" style={styles.toggleText}>
                Use a different email
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
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
          <ThemedText variant="heroTitle">Tonight</ThemedText>
          <ThemedText variant="metadata">
            {isSignUp
              ? 'Create an account to save your taste, friends, and picks.'
              : 'Welcome back — sign in to pick something great.'}
          </ThemedText>
        </View>

        {!isConfigured ? (
          <View style={styles.banner}>
            <ThemedText variant="caption" style={styles.bannerText}>
              Sign-in is unavailable — Supabase environment is not configured.
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.oauth}>
          {/* Deferred: rendered but disabled with a "coming soon" note. */}
          <Button
            label="Continue with Apple"
            variant="secondary"
            disabled
            onPress={handleAppleSignIn}
          />
          <Button
            label="Continue with Google"
            variant="secondary"
            disabled
            onPress={handleGoogleSignIn}
          />
          <ThemedText variant="caption" style={styles.comingSoon}>
            Apple & Google sign-in coming soon
          </ThemedText>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <ThemedText variant="caption" style={styles.dividerLabel}>
            or use email
          </ThemedText>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.form}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            editable={isConfigured}
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            autoComplete={isSignUp ? 'new-password' : 'password'}
            textContentType={isSignUp ? 'newPassword' : 'password'}
            editable={isConfigured}
            error={error ?? undefined}
          />
          <Button
            label={isSignUp ? 'Create account' : 'Sign in'}
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={submitting}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={toggleMode}
          style={styles.toggle}
        >
          <ThemedText variant="caption" style={styles.toggleText}>
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    justifyContent: 'center',
  },
  checkEmail: {
    paddingHorizontal: spacing.inset,
    gap: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.inset,
    gap: spacing.rail,
  },
  header: {
    gap: spacing.sm,
  },
  banner: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent,
    padding: spacing.lg,
  },
  bannerText: {
    color: colors.textPrimary,
  },
  oauth: {
    gap: spacing.md,
  },
  comingSoon: {
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerLabel: {
    color: colors.textMuted,
  },
  form: {
    gap: spacing.lg,
  },
  infoText: {
    color: colors.textPrimary,
  },
  errorText: {
    color: colors.accent,
  },
  toggle: {
    alignItems: 'center',
  },
  toggleText: {
    color: colors.textPrimary,
  },
});
