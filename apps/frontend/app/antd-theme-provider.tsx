'use client';

import { ConfigProvider, theme } from 'antd';

interface AntdThemeProviderProps {
  children: React.ReactNode;
}

export function AntdThemeProvider({ children }: AntdThemeProviderProps) {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      {children}
    </ConfigProvider>
  );
}
