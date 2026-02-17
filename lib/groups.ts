import { supabase } from './supabase';

export interface UserGroup {
  id: string;
  name: string;
  photo_url: string | null;
}

/**
 * Get all groups the user belongs to
 */
export async function getUserGroups(userId: string): Promise<UserGroup[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      group:groups(
        id,
        name,
        photo_url
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;

  // Extract groups from nested structure and filter nulls
  // Supabase returns group as an array due to the join relation type
  const groups: UserGroup[] = [];
  for (const row of data || []) {
    const g = row.group;
    if (Array.isArray(g)) {
      // When relation returns array, take first element
      const first = g[0];
      if (first && first.id && first.name !== undefined) {
        groups.push({ id: first.id, name: first.name, photo_url: first.photo_url });
      }
    } else if (g && (g as any).id) {
      const grp = g as any;
      groups.push({ id: grp.id, name: grp.name, photo_url: grp.photo_url });
    }
  }
  return groups;
}
