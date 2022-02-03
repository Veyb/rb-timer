// global modules
import moment from 'moment';
import Link from 'next/link';
import { Button, Space } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';

// local modules
import { useAuthContext } from '../../contexts/auth-context';

// styles modules
import styles from './header.module.css';

export const Header = () => {
  const auth = useAuthContext();
  const [time, setTime] = useState(moment().format('HH:mm'));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(moment().format('HH:mm'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.holder}>
        <Link href="/">
          <a className={styles.homeLink}>
            <HomeOutlined className={styles.homeIcon} />
          </a>
        </Link>
        <Space size="large" className={styles.rightBlock}>
          <h2 className={styles.time}>{time}</h2>
          {auth.loggedIn ? (
            <Button shape="round" size="large" onClick={auth.logout}>
              Выход
            </Button>
          ) : (
            <Link href="/login">
              <a>
                <Button shape="round" size="large">
                  Вход
                </Button>
              </a>
            </Link>
          )}
        </Space>
      </div>
    </header>
  );
};
