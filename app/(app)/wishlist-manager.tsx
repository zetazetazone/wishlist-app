import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { WishlistManager } from '../../components/wishlist/WishlistManager';

export default function WishlistManagerScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen
        options={{
          title: t('wishlists.manageWishlists'),
          headerBackTitle: t('common.back'),
        }}
      />
      <WishlistManager />
    </>
  );
}
