import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { queryClient } from '@/lib/query-client';
import { routes } from '@/lib/routes';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

// Anchor a matched "/" into the tabs group; the guard redirects as needed.
export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator fontsReady={fontsLoaded || !!fontError} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { session, loading, onboardedAt, profileLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Wait for fonts + initial auth; when signed in, also wait for the profile row
  // so we don't flash the wrong group before the onboarding gate resolves.
  const ready = fontsReady && !loading && (!session || !profileLoading);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    const group = segments[0] as string | undefined;
    const inAuth = group === '(auth)';
    const inOnboarding = group === '(onboarding)';
    // Allow `/invite/[code]` to mount long enough to stash / accept before redirect.
    const inInvite = group === 'invite';

    if (!session) {
      if (!inAuth && !inInvite) router.replace(routes.auth);
    } else if (onboardedAt == null) {
      if (!inOnboarding && !inInvite) router.replace(routes.onboarding.services);
    } else if (inAuth || inOnboarding) {
      router.replace(routes.tabs);
    }
  }, [ready, session, onboardedAt, segments, router]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="title/[id]" />
      <Stack.Screen name="invite/[code]" />
    </Stack>
  );
}
