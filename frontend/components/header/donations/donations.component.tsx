import { Dropdown } from 'antd';
import styled from 'styled-components';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Donation } from '../../../types';
import { Scrollable } from '../../scrollable';
import { Button } from '../../../styled-components';
import { Menu, MenuItem } from '../../menu';
import { getAllDonationList } from '../../../lib/api';
import { useAuthContext } from '../../../contexts/auth-context';
import { socket } from '../../../lib/web-sockets';

const DonationItem = styled(MenuItem)`
  display: flex;
  justify-content: space-between;
`;

const sum = (acc: number, { value }: Donation) => acc + value;

export const Donations = () => {
  const auth = useAuthContext();
  const [donations, setDonations] = useState<Donation[]>([]);

  const renderMenu = useCallback(
    (donations: Donation[]) => (
      <Menu style={{ minWidth: '25rem' }}>
        <Scrollable maxHeight={30}>
          {donations.map((donation, index) => (
            <DonationItem key={index}>
              <span>{donation.name}</span>
              <span>{donation.value} &#8381;</span>
            </DonationItem>
          ))}
        </Scrollable>
      </Menu>
    ),
    []
  );

  const totalSum = useMemo(() => donations.reduce(sum, 0), [donations]);

  useEffect(() => {
    getAllDonationList(auth.accessToken).then(({ data, meta }) => {
      setDonations(data);
    });
  }, [auth.accessToken]);

  useEffect(() => {
    socket.on('newDonations', setDonations);

    return () => {
      socket.off('newDonations', setDonations);
    };
  }, []);

  return !donations.length ? (
    <Button size="large" className="donations">
      {`Донаты: ${totalSum} `}&#8381;
    </Button>
  ) : (
    <Dropdown
      trigger={['click']}
      placement="bottomRight"
      overlay={renderMenu(donations)}
      disabled={!donations.length}
    >
      <Button size="large" className="donations">
        {`Донаты: ${totalSum} `}&#8381;
      </Button>
    </Dropdown>
  );
};
