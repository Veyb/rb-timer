// global modules
import Router from 'next/router';
import { useEffect } from 'react';

const Profile = () => {
  useEffect(() => {
    const { pathname } = Router;
    if (pathname == '/profile') {
      Router.push('/profile/collections');
    }
  }, []);

  return null;
};

export default Profile;
