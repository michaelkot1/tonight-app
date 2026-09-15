import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { colors, radius, spacing } from '@/theme';

interface StoryProgressBarProps {
  count: number;
  index: number;
  /** 0→1 progress of the ACTIVE segment. */
  progress: SharedValue<number>;
}

/** Instagram-style segmented progress bar across the top of the story. */
export function StoryProgressBar({ count, index, progress }: StoryProgressBarProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.track}>
          {i < index ? (
            <View style={[styles.fill, styles.fullFill]} />
          ) : i === index ? (
            <ActiveFill progress={progress} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

function ActiveFill({ progress }: { progress: SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));
  return <Animated.View style={[styles.fill, animatedStyle]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.inset,
  },
  track: {
    flex: 1,
    height: 3,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.textPrimary,
  },
  fullFill: {
    width: '100%',
  },
});
