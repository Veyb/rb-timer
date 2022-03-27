// global modules
import { NextPageContext } from 'next';

const Profile = () => null;

export function getServerSideProps(ctx: NextPageContext) {
  return {
    redirect: { permanent: false, destination: '/profile/collections' },
    props: {},
  };
}

export default Profile;
