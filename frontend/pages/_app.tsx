// global modules
import 'antd/dist/antd.dark.css';
import Head from 'next/head';
import { Normalize } from 'styled-normalize';
import { destroyCookie, parseCookies } from 'nookies';
import type { AppContext, AppProps } from 'next/app';

// local modules
import { User } from '../types';
import { apiGet } from '../lib/api';
import { Header } from '../components/header';
import { GlobalStyle } from '../theme/global-style';
import { serverRedirect } from '../lib/server-redirect';
import { AuthContextProvider } from '../contexts/auth-context';

interface MyAppProps extends AppProps {
  user: User | null;
  jwt: string | undefined;
}

function MyApp({ Component, pageProps, user, jwt }: MyAppProps) {
  return (
    <>
      <Normalize />
      <GlobalStyle />
      <AuthContextProvider jwt={jwt} user={user}>
        <Head>
          <title>L2m db</title>
          <meta name="viewport" content="width=device-width" />
          <meta name="MobileOptimized" content="580" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
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
    </>
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
      const data = await apiGet('/users/me', {
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
