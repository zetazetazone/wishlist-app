import { TouchableOpacity } from 'react-native';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface FavoriteHeartProps {
  isFavorite: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function FavoriteHeart({ isFavorite, onPress, disabled }: FavoriteHeartProps) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}>
      <MotiView
        key={isFavorite ? 'filled' : 'outline'}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{
          type: 'spring',
          damping: 15,
          stiffness: 300,
        }}
      >
        <MaterialCommunityIcons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={24}
          color={colors.burgundy[300]}
        />
      </MotiView>
    </TouchableOpacity>
  );
}

export default FavoriteHeart;
