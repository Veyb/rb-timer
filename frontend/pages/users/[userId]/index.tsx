// global modules
import { NextPageContext } from 'next';

const UserById = () => null;

export function getServerSideProps(ctx: NextPageContext) {
  const { userId } = ctx.query;

  return {
    redirect: { permanent: false, destination: `/users/${userId}/management` },
    props: {},
  };
}

export default UserById;
