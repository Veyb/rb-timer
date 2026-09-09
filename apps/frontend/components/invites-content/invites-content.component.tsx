'use client';

// global modules
import { Tabs, type TabsProps } from 'antd';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';

// local modules
import { TEST_IDS } from '../../constants/test-ids';
import { useAuthContext } from '../../contexts/auth-context';
// style modules
import styles from '../../styles/main.module.css';
import { AccessPlaceholder } from '../access-placeholder';
import { InviteHistoryBlock } from '../invite-history-block';
import { InvitesBlock } from '../invites-block';
import { Layout } from '../layout';

const Holder = styled.div`
  padding-bottom: 0;

  h1 {
    margin: 0;
  }

  & .ant-tabs {
    font-size: 1.4rem;
  }

  & .ant-tabs-content {
    height: 100%;
  }

  & .ant-tabs-tab-btn {
    font-size: 1.4rem;
  }
`;

interface InvitesContentProps {
  type: string;
}

/**
 * Invitations, as their own screen rather than a corner of the profile.
 *
 * Issuing codes and reading who came in by them is running a community, not
 * tending your own account, and it has grown two tabs of its own. The profile
 * is where you look at yourself.
 *
 * The gate here has three steps because there are three different reasons to
 * be turned away, and each has a different way out: not signed in, signed in
 * but outside the gate entirely, and inside it but not an officer. The last
 * one is this screen's own — every other screen in the app is open to any
 * member.
 */
export const InvitesContent = ({ type }: InvitesContentProps) => {
  const router = useRouter();
  const { loggedIn, allowed, allowedManage } = useAuthContext();

  if (!loggedIn) {
    return (
      <div className={styles.infoHolder}>
        <h2 className={styles.infoMessage}>Требуется авторизация</h2>
      </div>
    );
  }

  if (!allowed) return <AccessPlaceholder />;

  if (!allowedManage) {
    return (
      <div className={styles.infoHolder} data-testid={TEST_IDS.invites.officersOnly}>
        <h2>Раздел для офицеров</h2>
        <div>
          Приглашать игроков в сообщество и смотреть историю приглашений может только офицер. Если
          вам нужен доступ — попросите офицера своего сообщества.
        </div>
      </div>
    );
  }

  const items: TabsProps['items'] = [
    {
      key: 'codes',
      // The label carries the test id: antd renders the tab itself, so there is
      // no element of ours to put it on otherwise.
      label: <span data-testid={TEST_IDS.invites.codesTab}>Коды</span>,
      children: <InvitesBlock />,
    },
    {
      key: 'history',
      label: <span data-testid={TEST_IDS.invites.historyTab}>История</span>,
      children: <InviteHistoryBlock />,
    },
  ];

  return (
    <Holder className={styles.container}>
      <Layout className={styles.profileLayout}>
        <h1>Приглашения</h1>
        <Tabs
          onChange={(key) => router.push(`/invites/${key}`)}
          activeKey={items.some((item) => item.key === type) ? type : 'codes'}
          items={items}
        />
      </Layout>
    </Holder>
  );
};
