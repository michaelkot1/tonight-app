import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextInput } from '@/components/text-input';
import { ThemedText } from '@/components/themed-text';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import { colors, motion, radius, spacing } from '@/theme';

const LOGO = require('@/assets/images/tonight-logo.png');
const LOGO_WIDTH = 220;
const LOGO_ASPECT = 166 / 578;

type Mode = 'signIn' | 'signUp';

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isConfigured, signInWithEmail, signUpWithEmail, signInWithApple } =
    useAuth();

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [appleSubmitting, setAppleSubmitting] = useState(false);

  const isSignUp = mode === 'signUp';
  const trimmedEmail = email.trim();
  const busy = submitting || appleSubmitting;
  const canSubmit =
    isConfigured &&
    trimmedEmail.length > 0 &&
    password.length > 0 &&
    !busy;
  // Keep the button clickable on iOS even when the native module isn't
  // available (e.g. Expo Go) — tapping surfaces a helpful error instead of
  // a silently disabled button.
  const canApple = isConfigured && Platform.OS === 'ios' && !busy;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
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
        router.push(routes.confirmEmail(trimmedEmail));
      }
      // If a session was returned (confirm-email off), the root guard redirects.
      return;
    }

    const { error: authError } = await signInWithEmail(trimmedEmail, password);
    setSubmitting(false);
    if (!authError) return;

    // Unconfirmed accounts can't sign in — send them to enter the OTP.
    if (/not confirmed|confirm/i.test(authError)) {
      router.push(routes.confirmEmail(trimmedEmail));
      return;
    }
    setError(authError);
  }

  async function handleAppleSignIn() {
    if (!canApple) return;
    setError(null);
    setAppleSubmitting(true);
    const { error: authError, canceled } = await signInWithApple();
    setAppleSubmitting(false);
    if (canceled || !authError) return;
    setError(authError);
  }

  function toggleMode() {
    setMode(isSignUp ? 'signIn' : 'signUp');
    setError(null);
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
          <Animated.View
            entering={FadeIn.duration(motion.slow)}
            style={styles.brand}
          >
            <Image
              source={LOGO}
              style={styles.logo}
              contentFit="contain"
              accessibilityLabel="Tonight"
            />
            <ThemedText variant="metadata" style={styles.tagline}>
              {isSignUp
                ? 'Save your taste. Find something worth watching.'
                : 'Pick something great tonight.'}
            </ThemedText>
          </Animated.View>

          {!isConfigured ? (
            <View style={styles.banner}>
              <ThemedText variant="caption" style={styles.bannerText}>
                Sign-in is unavailable — Supabase environment is not configured.
              </ThemedText>
            </View>
          ) : null}

          <Animated.View
            entering={FadeInDown.duration(motion.slow).delay(80)}
            style={styles.body}
          >
            <View style={styles.oauth}>
              <Button
                label="Continue with Apple"
                variant="secondary"
                disabled={!canApple}
                loading={appleSubmitting}
                onPress={handleAppleSignIn}
              />
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
                editable={isConfigured && !busy}
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
                editable={isConfigured && !busy}
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
          </Animated.View>
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
  brand: {
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_WIDTH * LOGO_ASPECT,
  },
  tagline: {
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
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
    textAlign: 'center',
  },
  body: {
    gap: spacing.rail,
  },
  oauth: {
    gap: spacing.md,
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
  toggle: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  toggleText: {
    color: colors.textMuted,
  },
});
