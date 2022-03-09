// global modules
import moment from 'moment';
import { useCallback } from 'react';
import { Button, Tooltip } from 'antd';
import {
  TeamOutlined,
  QuestionOutlined,
  FieldTimeOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';

// local modules
import { getNewRespawnTime } from './utils';
import { Boss, Quality } from '../../../../types';
import { updateBossTime } from '../../../../lib/api';
import { useAuthContext } from '../../../../contexts/auth-context';
import { useBossContext } from '../../../../contexts/boss-context';

// style modules
import styles from '../../boss-list-table.module.css';

function getColor(quality: Quality) {
  switch (quality) {
    case 'red':
      return '#a61d24';
    case 'blue':
      return '#1765ad';
    case 'purple':
      return '#854eca';
    case 'none':
      return '#aa7714';
  }
}

interface NameColumnProps {
  boss: Boss;
}

export const NameColumn = ({ boss }: NameColumnProps) => {
  const { updateBossInList } = useBossContext();
  const { accessToken, allowedUpdate } = useAuthContext();

  const isOutOfDate = moment().valueOf() > boss.respawnTime;
  const baseTitle = `Интервал появления ${boss.interval} часов. (${boss.chance}%)`;
  const title = boss.firstInterval
    ? `Первое появление спустя ${boss.firstInterval} часов. ${baseTitle}`
    : baseTitle;

  const notRespawnedClick = useCallback(() => {
    const time = getNewRespawnTime(boss.respawnTime, boss.interval);
    updateBossTime(boss.id, { time, approximately: true }, accessToken).then(
      (newBossApiInfo) => updateBossInList(newBossApiInfo)
    );
  }, [accessToken, boss, updateBossInList]);

  return (
    <>
      {boss.restarted && <FieldTimeOutlined className={styles.restartedIcon} />}
      {boss.alliance && <TeamOutlined className={styles.allianceIcon} />}
      <Tooltip placement="top" title={title}>
        <span style={{ color: getColor(boss.quality) }}>{boss.name}</span>
      </Tooltip>
      {isOutOfDate &&
        (allowedUpdate ? (
          <Button
            size="small"
            shape="circle"
            className={styles.outDateIcon}
            icon={<QuestionOutlined />}
            onClick={notRespawnedClick}
          />
        ) : (
          <QuestionCircleOutlined className={styles.outDateIcon} />
        ))}
    </>
  );
};
