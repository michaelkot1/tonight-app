import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { ProfileSummary } from '@/hooks/use-friends';
import { friendFirstName } from '@/lib/social';
import { colors } from '@/theme';

const AVATAR_SIZE = 28;
const OVERLAP = 10;

interface FriendPileProps {
  friends: ProfileSummary[];
  /** Max avatars shown (design default: 3). */
  max?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Overlapping 28px friend avatars with a 2px `#0C0C0F` ring — design.md
 * "Friend piles are first-class".
 */
export function FriendPile({ friends, max = 3, style }: FriendPileProps) {
  const visible = friends.slice(0, max);
  if (visible.length === 0) return null;

  return (
    <View
      style={[styles.row, style]}
      accessibilityRole="image"
      accessibilityLabel={`${visible.length} friends`}
    >
      {visible.map((friend, index) => (
        <View
          key={friend.id}
          style={[
            styles.avatar,
            { marginLeft: index === 0 ? 0 : -OVERLAP, zIndex: visible.length - index },
          ]}
        >
          {friend.avatar_url ? (
            <Image
              source={{ uri: friend.avatar_url }}
              style={styles.image}
              contentFit="cover"
              transition={150}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.fallback}>
              <ThemedText variant="caption" style={styles.initial}>
                {initialFor(friend)}
              </ThemedText>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function initialFor(profile: ProfileSummary): string {
  const name = friendFirstName(profile);
  const ch = name.replace(/^@/, '').charAt(0);
  return (ch || '?').toUpperCase();
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.shell,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  initial: {
    color: colors.textPrimary,
    fontSize: 11,
    lineHeight: 14,
  },
});
