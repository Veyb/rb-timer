'use client';

// global modules
import { Result } from 'antd';
import { useEffect } from 'react';

// local modules
import { Button } from '../styled-components';
// style modules
import styles from '../styles/main.module.css';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * What a reader sees when a page could not be built.
 *
 * There was no boundary at all before, and every page wrapped its fetch in
 * `try {} catch {}` — so a backend that was down rendered as an empty list,
 * indistinguishable from a community with nothing in it. Pages now let a
 * genuine fault through, and it arrives here.
 *
 * `reset()` re-runs the segment, which is the right offer: these failures are
 * usually a request that can simply be made again.
 */
// Named `RouteError` rather than `Error`: the file convention cares about the
// default export, not its name, and shadowing the global reads badly.
export default function RouteError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // The digest is all the client gets of a server-side error; without it in
    // the console there is nothing to match against the server's own log.
    console.error('Route failed to render', error.digest ?? '', error);
  }, [error]);

  return (
    <div className={styles.infoHolder}>
      <Result
        status="error"
        title="Не удалось загрузить страницу"
        subTitle="Сервер не ответил или ответил ошибкой. Попробуйте ещё раз — если не поможет, загляните позже."
        extra={
          <Button type="primary" onClick={reset}>
            Повторить
          </Button>
        }
      />
    </div>
  );
}
