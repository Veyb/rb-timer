import { Tooltip } from 'antd';

import { Boss, Quality } from '../../types';

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

export const NameColumn = ({ boss }: NameColumnProps) => (
  <Tooltip
    placement="top"
    title={`Интервал появления ${boss.interval} часов. (${boss.chance}%)`}
  >
    <span style={{ color: getColor(boss.quality) }}>{boss.name}</span>
  </Tooltip>
);
