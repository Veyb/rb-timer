// global modules
import { cookies } from 'next/headers';

// local modules
import { User } from '../types';
import { apiGet } from './api';

interface CurrentUser {
  user: User | null;
  jwt: string | undefined;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const jwt = (await cookies()).get('jwt')?.value;

  if (!jwt) return { user: null, jwt: undefined };

  try {
    const user = await apiGet('/users/me', {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    return { user, jwt };
  } catch (err: any) {
    return { user: null, jwt: undefined };
  }
}
