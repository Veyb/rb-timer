import { AntdRegistry } from '@ant-design/nextjs-registry';
import type { Metadata, Viewport } from 'next';

import { Header } from '../components/header';
import { getCurrentUser } from '../lib/get-current-user';
import { AuthContextProvider } from '../contexts/auth-context';
import { AntdThemeProvider } from './antd-theme-provider';
import { GlobalStyles } from './global-styles';
import { StyledComponentsRegistry } from './styled-components-registry';

export const metadata: Metadata = {
  title: 'L2m db',
  description: 'Timer for tracking the respawn of raid bosses',
  icons: { icon: '/favicon.ico' },
  appleWebApp: { capable: true },
  other: {
    MobileOptimized: '580',
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, jwt } = await getCurrentUser();

  return (
    <html>
      <body>
        <StyledComponentsRegistry>
          <AntdRegistry>
            <AntdThemeProvider>
              <GlobalStyles />
              <AuthContextProvider jwt={jwt} user={user}>
                <Header />
                <main>{children}</main>
              </AuthContextProvider>
            </AntdThemeProvider>
          </AntdRegistry>
        </StyledComponentsRegistry>
        <div id="modal-root"></div>
      </body>
    </html>
  );
}
