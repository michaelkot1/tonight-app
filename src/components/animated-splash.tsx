import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, motion } from '@/theme';

const LOGO = require('@/assets/images/tonight-logo.png');

/** Strong ease-out for enter/exit (expo-animation skill). */
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

const LOGO_WIDTH = 200;
const LOGO_ASPECT = 166 / 578;
const MIN_HOLD_MS = 800;
const MIN_HOLD_SESSION_MS = 200;
const EXIT_MS = 280;
const REDUCED_MS = 150;

export interface AnimatedSplashProps {
  /** Auth + fonts ready — destination can show under the overlay. */
  canDismiss: boolean;
  /** Signed-in sessions skip the long brand hold. */
  hasSession: boolean;
  /** Fire once when the JS splash has painted so native splash can hide. */
  onNativeHide: () => void;
  /** Fire after the exit animation completes. */
  onFinished: () => void;
}

/**
 * Full-screen brand overlay that bridges native splash → app shell.
 * Opacity + transform only; reduced motion uses a short opacity fade.
 */
export function AnimatedSplash({
  canDismiss,
  hasSession,
  onNativeHide,
  onFinished,
}: AnimatedSplashProps) {
  const reducedMotion = useReducedMotion();
  const reduced = !!reducedMotion;

  const overlayOpacity = useSharedValue(1);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(reduced ? 1 : 0.94);

  const nativeHiddenRef = useRef(false);
  const exitingRef = useRef(false);
  const enterDoneRef = useRef(false);
  const mountedAtRef = useRef(0);
  const onFinishedRef = useRef(onFinished);
  const onNativeHideRef = useRef(onNativeHide);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    onNativeHideRef.current = onNativeHide;
  }, [onNativeHide]);

  useEffect(() => {
    mountedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    const enterMs = reduced ? REDUCED_MS : motion.slow;

    const markEnterDone = () => {
      enterDoneRef.current = true;
    };

    logoOpacity.value = withTiming(
      1,
      { duration: enterMs, easing: EASE_OUT },
      (finished) => {
        if (finished) {
          runOnJS(markEnterDone)();
        }
      },
    );

    if (!reduced) {
      logoScale.value = withTiming(1, {
        duration: enterMs,
        easing: EASE_OUT,
      });
    } else {
      logoScale.value = 1;
      // Opacity-only enter still needs the done flag if scale path skipped mid-flight.
    }
  }, [logoOpacity, logoScale, reduced]);

  useEffect(() => {
    if (!canDismiss || exitingRef.current) return;

    let cancelled = false;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    const minHold = hasSession ? MIN_HOLD_SESSION_MS : MIN_HOLD_MS;

    const runExit = () => {
      if (cancelled || exitingRef.current) return;
      exitingRef.current = true;

      const exitMs = reduced ? REDUCED_MS : EXIT_MS;
      const notifyFinished = () => {
        onFinishedRef.current();
      };

      overlayOpacity.value = withTiming(
        0,
        { duration: exitMs, easing: EASE_OUT },
        (finished) => {
          if (finished) {
            runOnJS(notifyFinished)();
          }
        },
      );

      if (!reduced) {
        logoScale.value = withTiming(1.04, {
          duration: exitMs,
          easing: EASE_OUT,
        });
      }
    };

    const scheduleExit = () => {
      const startedAt = mountedAtRef.current || Date.now();
      const remaining = Math.max(0, minHold - (Date.now() - startedAt));
      holdTimer = setTimeout(runExit, remaining);
    };

    if (enterDoneRef.current) {
      scheduleExit();
    } else {
      pollTimer = setInterval(() => {
        if (cancelled) return;
        if (enterDoneRef.current) {
          if (pollTimer) clearInterval(pollTimer);
          pollTimer = undefined;
          scheduleExit();
        }
      }, 32);
    }

    return () => {
      cancelled = true;
      if (holdTimer) clearTimeout(holdTimer);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [canDismiss, hasSession, logoScale, overlayOpacity, reduced]);

  function handleLayout() {
    if (nativeHiddenRef.current) return;
    nativeHiddenRef.current = true;
    onNativeHideRef.current();
  }

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="auto"
      onLayout={handleLayout}
      style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <Image
            source={LOGO}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="Tonight"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: colors.bg,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_WIDTH * LOGO_ASPECT,
  },
});
