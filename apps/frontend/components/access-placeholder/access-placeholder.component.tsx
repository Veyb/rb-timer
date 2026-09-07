'use client';

// global modules
import { useAuthContext } from '../../contexts/auth-context';
// local modules
import { NoCommunityBlock } from './no-community-block.component';
import { NoRoleBlock } from './no-role-block.component';

/**
 * Picks the placeholder that matches why access was refused, so every screen
 * can keep its own `if (!allowed)` check without repeating that reasoning.
 * Callers still handle the not-signed-in case themselves.
 */
export const AccessPlaceholder = () => {
  const { hasCommunity } = useAuthContext();

  return hasCommunity ? <NoRoleBlock /> : <NoCommunityBlock />;
};
