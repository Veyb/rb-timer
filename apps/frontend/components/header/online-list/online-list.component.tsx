// global modules

import { TeamOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import { Fragment, useCallback, useEffect, useState } from 'react';

// local modules
import { socket } from '../../../lib/web-sockets';
import { Button } from '../../../styled-components';
import type { SocketUser } from '../../../types';
import { Menu, MenuDivider, MenuItem } from '../../menu';
import { Scrollable } from '../../scrollable';

type ServerSocketUsers = Record<string, SocketUser | null>;

interface SocketUserData {
  user: SocketUser | null;
  socketIds: string[];
  count: number;
}

export const OnlineList = () => {
  const [socketUsers, setSocketUsers] = useState<SocketUserData[]>([]);

  const updateSocketUsers = useCallback(({ socketUsers }: { socketUsers: ServerSocketUsers }) => {
    const users = Object.entries(socketUsers).reduce(
      (acc: Record<string, SocketUserData>, [socketId, socketUser]) => {
        const userId: string = socketUser ? `${socketUser.id}` : 'anonymous';

        const user: SocketUserData = acc[userId]
          ? {
              ...acc[userId],
              socketIds: [...acc[userId].socketIds, socketId],
              count: acc[userId].count + 1,
            }
          : { user: socketUser, socketIds: [socketId], count: 1 };

        acc[userId] = user;
        return acc;
      },
      {},
    ) as Record<string, SocketUserData>;

    const sortedSocketUsers = Object.values(users).sort((a, b) => {
      if (!a.user || !b.user) return 1;
      return a.user.nickname.localeCompare(b.user.nickname);
    });

    setSocketUsers(sortedSocketUsers);
  }, []);

  useEffect(() => {
    socket.on('socketUsers', updateSocketUsers);

    return () => {
      socket.off('socketUsers', updateSocketUsers);
    };
  }, [updateSocketUsers]);

  const renderMenu = useCallback(
    (socketUsers: SocketUserData[]) => (
      <Menu style={{ minWidth: '20rem' }}>
        <Scrollable maxHeight={30}>
          {socketUsers.map((socketUser) =>
            socketUser.user ? (
              <MenuItem key={socketUser.user.id}>
                <div>
                  {socketUser.count > 1
                    ? `${socketUser.user.nickname} (${socketUser.count})`
                    : `${socketUser.user.nickname}`}
                </div>
              </MenuItem>
            ) : (
              <Fragment key={socketUser.socketIds.join(',')}>
                <MenuDivider />
                <MenuItem key={socketUser.socketIds.join(',')}>
                  <div>{socketUser.count > 1 ? `Аноним (${socketUser.count})` : `Аноним`}</div>
                </MenuItem>
              </Fragment>
            ),
          )}
        </Scrollable>
      </Menu>
    ),
    [],
  );

  return (
    <Dropdown
      trigger={['click']}
      placement="bottomRight"
      popupRender={() => renderMenu(socketUsers)}
      disabled={!socketUsers.length}
    >
      <Button size="large" icon={<TeamOutlined />}>
        {socketUsers.length}
      </Button>
    </Dropdown>
  );
};
