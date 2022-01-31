// global modules
import moment from 'moment';
import { Tooltip } from 'antd';
import { TeamOutlined, QuestionCircleOutlined } from '@ant-design/icons';

// local modules
import { Boss, Quality } from '../../../../types';

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
  const isOutOfDate = moment().valueOf() > boss.respawnTime;

  return (
    <>
      {boss.alliance && <TeamOutlined className={styles.allianceIcon} />}
      <Tooltip
        placement="top"
        title={`Интервал появления ${boss.interval} часов. (${boss.chance}%)`}
      >
        <span style={{ color: getColor(boss.quality) }}>{boss.name}</span>
      </Tooltip>
      {isOutOfDate && <QuestionCircleOutlined className={styles.outDateIcon} />}
    </>
  );
};
