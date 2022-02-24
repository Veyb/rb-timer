// global modules
import 'normalize.css';
import 'antd/dist/antd.dark.css';
import Head from 'next/head';
import { destroyCookie, parseCookies } from 'nookies';
import type { AppContext, AppProps } from 'next/app';

// local modules
import { get } from '../lib/api';
import { Header } from '../components/header';
import { serverRedirect } from '../lib/server-redirect';
import { AuthContextProvider } from '../contexts/auth-context';

// style modules
import '../styles/globals.css';

interface MyAppProps extends AppProps {
  user: any;
  jwt: string | undefined;
}

function MyApp({ Component, pageProps, user, jwt }: MyAppProps) {
  return (
    <AuthContextProvider jwt={jwt} user={user}>
      <Head>
        <title>L2m db</title>
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        <meta
          name="description"
          content="Timer for tracking the respawn of raid bosses"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />
      <main>
        <Component {...pageProps} />
      </main>
    </AuthContextProvider>
  );
}

MyApp.getInitialProps = async ({ Component, ctx }: AppContext) => {
  let user = null;
  let pageProps = {};
  const jwt = parseCookies(ctx).jwt;

  if (Component.getInitialProps) {
    pageProps = await Component.getInitialProps(ctx);
  }

  if (!jwt && ctx.pathname !== '/login' && ctx.pathname !== '/register') {
    serverRedirect(ctx, '/login');
  }

  if (jwt) {
    try {
      const data = await get('/users/me', {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      user = data;
    } catch (err: any) {
      destroyCookie(ctx, 'jwt', { path: '/' });
      serverRedirect(ctx, '/login');
    }
  }

  return {
    pageProps,
    user,
    jwt,
  };
};

export default MyApp;
