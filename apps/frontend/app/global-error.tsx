'use client';

// global modules
import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * The last boundary: a failure in the root layout itself.
 *
 * `app/error.tsx` sits inside the layout, so it cannot catch the layout
 * failing — and the layout is where the shell asks the backend who the caller
 * is. Without this, a backend that is down took the whole document with it.
 *
 * It replaces `<html>` and `<body>`, so none of the app's providers are
 * available here: no antd theme, no styled-components registry. The markup is
 * plain and self-contained on purpose.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Root layout failed to render', error.digest ?? '', error);
  }, [error]);

  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#141414',
          color: 'rgba(255, 255, 255, 0.85)',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <div>
          <h1 style={{ fontSize: '2.4rem' }}>Сервер недоступен</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
            Приложение не смогло связаться с сервером. Это не проблема с вашей учётной записью.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.8rem 2rem',
              fontSize: '1.4rem',
              color: 'inherit',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              border: '0.1rem solid #434343',
              borderRadius: '0.2rem',
            }}
          >
            Повторить
          </button>
        </div>
      </body>
    </html>
  );
}
