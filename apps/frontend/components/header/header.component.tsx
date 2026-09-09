'use client';

import { UserOutlined } from '@ant-design/icons';
import { Dropdown, Modal, Space } from 'antd';
// global modules
import dayjs from 'dayjs';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { TEST_IDS } from '../../constants/test-ids';
import { useAuthContext } from '../../contexts/auth-context';
import { useIsClient } from '../../lib/hooks/use-is-client';
import { Button } from '../../styled-components';
import { Menu, MenuDivider, MenuItem } from '../menu';
// local modules
import { Donations } from './donations';
import { OnlineList } from './online-list';

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
    justify-content: left;
    width: 4.6rem;
    height: 4.6rem;
    position: relative;
  }

  & .donations {
    color: darkturquoise;
  }

  & .time {
    margin: 0;
    /* A box held open whether or not there is a clock in it. The first paint
       has none — see the comment in the component below — so without a reserve
       everything to its left would shift when the time appears.

       70px against the 69.1px that 23:59 measures at this heading size, so the
       reserve is what decides the width. That is under a pixel of headroom: a
       different font falling in, or a heavier weight, and the text would set
       the width again and the jump would come back. Re-measure before trusting
       it after any change to the heading's type.

       Tabular figures keep it still afterwards too — proportional digits
       change width as the minute ticks over. */
    min-width: 7rem;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  & .modalList {
    padding-left: 2rem;
  }
`;

export const Header = () => {
  const auth = useAuthContext();
  // Empty until mounted, on purpose. The server renders this component too,
  // and it renders the server's minute; a client hydrating one second later
  // computes its own. When the two straddle a minute boundary React reports a
  // hydration mismatch and rebuilds the tree — intermittently, roughly once a
  // minute, which is how the e2e console guard found it. Nothing but the clock
  // depends on the value, so the first paint simply has no clock.
  const mounted = useIsClient();
  const [time, setTime] = useState('');
  const [supportModal, setSupportModal] = useState(false);

  useEffect(() => {
    setTime(dayjs().format('HH:mm'));

    const timer = setInterval(() => {
      setTime(dayjs().format('HH:mm'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const menu = (
    <Menu>
      <MenuItem onClick={() => setSupportModal(true)}>Поддержать автора</MenuItem>
      <Link href="/profile">
        <MenuItem>Профиль</MenuItem>
      </Link>
      {auth.allowed && (
        <Link href="/users">
          <MenuItem>Пользователи</MenuItem>
        </Link>
      )}
      {/* Running the community, not tending your own account — so it sits
          beside the other sections rather than inside the profile, and only
          for the role that can actually use it. */}
      {auth.allowedManage && (
        <Link href="/invites">
          <MenuItem data-testid={TEST_IDS.invites.menuItem}>Приглашения</MenuItem>
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
          <Link href="/" className="homeLink">
            <Image priority fill sizes="100%" alt="logo" src="/logo_lu4.webp" />
          </Link>
          <Donations />
        </Space>
        <Space size="large">
          <OnlineList />
          <h2 className="time">{mounted ? time : ''}</h2>
          {auth.loggedIn ? (
            <Dropdown popupRender={() => menu} trigger={['click']} placement="bottomRight">
              <Button
                shape="circle"
                size="large"
                icon={<UserOutlined />}
                data-testid={TEST_IDS.header.userMenu}
              />
            </Dropdown>
          ) : (
            <Link href="/login">
              <Button shape="round">Вход</Button>
            </Link>
          )}
        </Space>
      </div>
      <Modal
        centered
        open={supportModal}
        title="Поддержать автора"
        onCancel={() => setSupportModal(false)}
        footer={null}
      >
        {
          <>
            <p>
              Если у вас, вдруг, появилось желание поддержать автора, это можно сделать по следующим
              реквизитам:
            </p>

            <ul className="modalList">
              <li>+79117961515 (Сбербанк/Тинькоф)</li>
              <li>4276 5500 3609 9714 (Сбербанк) Олег Ц.</li>
            </ul>
            <p>
              Или же любым другим удобным Вам способом. Для этого можете напрямую обратить к
              персонажу Тэя в игре или дискорде :)
            </p>

            <p>
              P.S.
              <br />
              Указывайте пожалуйста ник или как вас подписать (например Аноним), так как теперь есть
              возможность посмотреть список донатеров.
            </p>
            <p>Спасибо</p>
            <Image src="/requisites.jpg" alt="logo" width="200" height="200" />
          </>
        }
      </Modal>
    </Holder>
  );
};
