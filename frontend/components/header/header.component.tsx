// global modules
import moment from 'moment';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Dropdown, Menu, Space } from 'antd';
import { HomeOutlined, UserOutlined } from '@ant-design/icons';
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

  const menu = (
    <Menu>
      {/* <Menu.Item key="0">
        <Link href="/profile">
          <a>Профиль</a>
        </Link>
      </Menu.Item> */}
      {/* <Menu.Divider /> */}
      <Menu.Item key="3">
        <div onClick={auth.logout}>Выход</div>
      </Menu.Item>
    </Menu>
  );

  return (
    <header className={styles.header}>
      <div className={styles.holder}>
        <Link href="/">
          <a className={styles.homeLink}>
            <Image
              src="/l2m-logo-color.png"
              alt="logo"
              width="126"
              height="46"
            />
          </a>
        </Link>
        <Space size="large" className={styles.rightBlock}>
          <h2 className={styles.time}>{time}</h2>
          {auth.loggedIn ? (
            <Dropdown
              overlay={menu}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button shape="circle" size="large" icon={<UserOutlined />} />
            </Dropdown>
          ) : (
            <Link href="/login">
              <a>
                <Button shape="round">Вход</Button>
              </a>
            </Link>
          )}
        </Space>
      </div>
    </header>
  );
};
