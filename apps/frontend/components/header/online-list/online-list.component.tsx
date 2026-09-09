// global modules

import { TeamOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import { Fragment, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

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

/**
 * Holds the button still as the count changes.
 *
 * Measured in this font: a proportional `1` is 7.1px against 9.8px for every
 * other digit, so the button — and the clock and avatar beside it — shifted
 * 2.7px the moment presence arrived and the count went from 0 to 1.
 * `tabular-nums` equalises the digits at 9.8px.
 *
 * That alone leaves the jump from one digit to two, 9.8px to 19.5px, so the
 * box reserves the wider of them. Past 99 online it grows again, which is a
 * shift nobody will be sitting still enough to notice.
 */
const Count = styled.span`
  display: inline-block;
  text-align: center;
  font-variant-numeric: tabular-nums;
`;

export const OnlineList = () => {
  const [socketUsers, setSocketUsers] = useState<SocketUserData[]>([]);

  const updateSocketUsers = useCallback(({ socketUsers }: { socketUsers: ServerSocketUsers }) => {
    const users = Object.entries(socketUsers).reduce(
      (acc: Record<string, SocketUserData>, [socketId, socketUser]) => {
        const userId: string = socketUser ? socketUser.documentId : 'anonymous';

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
              <MenuItem key={socketUser.user.documentId}>
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
      <Button size="large" iconPlacement="end" icon={<TeamOutlined />}>
        <Count>{socketUsers.length}</Count>
      </Button>
    </Dropdown>
  );
};
