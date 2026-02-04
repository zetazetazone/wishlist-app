import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
} from '@gluestack-ui/themed';
import { getGroupPhotoUrl } from '@/lib/storage';

interface GroupAvatarProps {
  group: {
    name: string;
    photo_url: string | null;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

/**
 * Get initials from a group name (up to 3 letters)
 * Examples: "Family" -> "F", "Work Team" -> "WT", "Book Club Friends" -> "BCF"
 */
function getGroupInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

/**
 * GroupAvatar component that displays a group photo or initials fallback
 */
export function GroupAvatar({ group, size = 'lg' }: GroupAvatarProps) {
  const photoUrl = group.photo_url ? getGroupPhotoUrl(group.photo_url) : null;

  return (
    <Avatar bgColor="$primary500" size={size}>
      {photoUrl && (
        <AvatarImage source={{ uri: photoUrl }} alt={group.name} />
      )}
      <AvatarFallbackText>{getGroupInitials(group.name)}</AvatarFallbackText>
    </Avatar>
  );
}
