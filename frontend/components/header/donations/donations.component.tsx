import { Dropdown } from 'antd';
import moment from 'moment';
import 'moment/locale/ru';
import styled from 'styled-components';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import { Donation } from '../../../types';
import { Scrollable } from '../../scrollable';
import { Button } from '../../../styled-components';
import { Menu, MenuItem } from '../../menu';
import { getAllDonationList } from '../../../lib/api';
import { useAuthContext } from '../../../contexts/auth-context';
import { socket } from '../../../lib/web-sockets';

const DateItem = styled(MenuItem)`
  display: flex;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.45);
`;

const DonationItem = styled(MenuItem)`
  display: flex;
  justify-content: space-between;
`;

const DonationList = styled.ul`
  padding-left: 2rem;
`;

const sum = (acc: number, { value }: Donation) => acc + value;

const getDateKey = (donation: Donation) =>
  moment(donation.createdAt).locale('ru').format('MMMM YYYY');

export const Donations = () => {
  const auth = useAuthContext();
  const [donations, setDonations] = useState<Donation[]>([]);
  const currentDateKey = moment().locale('ru').format('MMMM YYYY');

  const renderMenu = useCallback(
    (dateKeys: string[], donationsHash: Record<string, Donation[]>) => (
      <Menu style={{ minWidth: '25rem' }}>
        <Scrollable maxHeight={30}>
          {dateKeys.map((date) => (
            <Fragment key={date}>
              <DateItem>{date}</DateItem>
              <DonationList>
                {donationsHash[date].map((donation, index) => (
                  <DonationItem key={`${date}_${index}`}>
                    <span>{donation.name}</span>
                    <span>{donation.value} &#8381;</span>
                  </DonationItem>
                ))}
              </DonationList>
            </Fragment>
          ))}
        </Scrollable>
      </Menu>
    ),
    []
  );

  const [dateKeys, donationsHash] = useMemo(
    () =>
      donations.reverse().reduce(
        (acc: [string[], Record<string, Donation[]>], donation) => {
          const dateKey = getDateKey(donation);
          if (!acc[0].includes(dateKey)) acc[0].push(dateKey);
          acc[1][dateKey]
            ? acc[1][dateKey].push(donation)
            : (acc[1][dateKey] = [donation]);

          return acc;
        },
        [[], {}]
      ),
    [donations]
  );

  const totalSumLastMonth = useMemo(
    () => (donationsHash[currentDateKey] || []).reduce(sum, 0),
    [currentDateKey, donationsHash]
  );

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
      &#8381;{` / мес: ${totalSumLastMonth} `}
    </Button>
  ) : (
    <Dropdown
      trigger={['click']}
      placement="bottomRight"
      overlay={renderMenu(dateKeys, donationsHash)}
      disabled={!donations.length}
    >
      <Button size="large" className="donations">
        &#8381;{` / мес: ${totalSumLastMonth} `}
      </Button>
    </Dropdown>
  );
};
