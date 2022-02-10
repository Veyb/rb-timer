// global modules
import moment from 'moment';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Dropdown, Menu, Modal, Space } from 'antd';
import { HomeOutlined, UserOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';

// local modules
import { useAuthContext } from '../../contexts/auth-context';

// styles modules
import styles from './header.module.css';

export const Header = () => {
  const auth = useAuthContext();
  const [time, setTime] = useState(moment().format('HH:mm'));
  const [supportModal, setSupportModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(moment().format('HH:mm'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const menu = (
    <Menu>
      <Menu.Item key="0">
        <div onClick={() => setSupportModal(true)}>Поддержать автора</div>
      </Menu.Item>
      <Menu.Divider />
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

      <Modal
        centered
        visible={supportModal}
        title="Поддержать автора"
        onCancel={() => setSupportModal(false)}
        footer={null}
      >
        {
          <>
            <p>
              Если у вас, вдруг, появилось желание поддержать автора, это можно
              сделать по следующим реквизитам:
            </p>
            <ul className={styles.modalList}>
              <li>+79117961515 (Сбербанк/Тинькоф)</li>
              <li>4276 5500 3609 9714 (Сбербанк)</li>
            </ul>

            <p>
              Или же любым другим удобным Вам способом. Для этого можете
              напрямую обратить к персонажу Тэя в игре или дискорде :)
            </p>
          </>
        }
      </Modal>
    </header>
  );
};
