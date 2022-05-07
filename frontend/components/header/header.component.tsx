// global modules
import moment from 'moment';
import Link from 'next/link';
import Image from 'next/image';
import styled from 'styled-components';
import { Dropdown, Modal, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';

// local modules
import { Donations } from './donations';
import { OnlineList } from './online-list';
import { Button } from '../../styled-components';
import { useAuthContext } from '../../contexts/auth-context';
import { Menu, MenuDivider, MenuItem } from '../menu';

const Holder = styled.header`
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 5.6rem;
  padding: 0 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--zIndexRoof);

  & .background {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 5.6rem;
    background-color: #262626;
    border-bottom: 0.1rem solid #303030;
  }

  & .wrapper {
    display: flex;
    width: 100%;
    max-width: 100rem;
    z-index: var(--zIndexRoof);
    justify-content: space-between;
  }

  & .homeLink {
    display: flex;
    align-items: center;
    align-content: center;
    justify-content: center;
    width: 12.6rem;
    height: 4.6rem;
    position: relative;
  }

  & .donations {
    color: darkturquoise;
  }

  & .time {
    margin: 0;
  }

  & .modalList {
    padding-left: 2rem;
  }
`;

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
      <MenuItem onClick={() => setSupportModal(true)}>
        Поддержать автора
      </MenuItem>
      <Link href="/profile">
        <a>
          <MenuItem>Профиль</MenuItem>
        </a>
      </Link>
      {auth.allowed && (
        <Link href="/users">
          <a>
            <MenuItem>Пользователи</MenuItem>
          </a>
        </Link>
      )}
      <MenuDivider />
      <MenuItem onClick={auth.logout}>Выход</MenuItem>
    </Menu>
  );

  return (
    <Holder>
      <div className="background" />
      <div className="wrapper">
        <Space size="large">
          <Link href="/">
            <a className="homeLink">
              <Image
                priority
                alt="logo"
                layout="fill"
                src="/l2m-logo-color.png"
              />
            </a>
          </Link>
          <Donations />
        </Space>
        <Space size="large">
          <OnlineList />
          <h2 className="time">{time}</h2>
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

            <ul className="modalList">
              <li>+79117961515 (Сбербанк/Тинькоф)</li>
              <li>4276 5500 3609 9714 (Сбербанк) Олег Ц.</li>
            </ul>
            <p>
              Или же любым другим удобным Вам способом. Для этого можете
              напрямую обратить к персонажу Тэя в игре или дискорде :)
            </p>

            <p>
              P.S.
              <br />
              Указывайте пожалуйста ник или как вас подписать (например Аноним),
              так как теперь есть возможность посмотреть список донатеров.
            </p>
            <p>Спасибо</p>
            <Image src="/requisites.jpg" alt="logo" width="200" height="200" />
          </>
        }
      </Modal>
    </Holder>
  );
};
