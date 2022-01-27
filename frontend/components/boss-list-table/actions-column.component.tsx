import moment from 'moment';
import { useCallback, useMemo, useState } from 'react';
import { Space, Button, DatePicker } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

import { Boss } from '../../types';
import { updateBossTime } from '../../lib/api';
import { expandBoss } from '../../lib/utils';

interface ActionsProps {
  boss: Boss;
  updateBossList: (boss: Boss) => void;
}

export const ActionsColumn = ({ boss, updateBossList }: ActionsProps) => {
  const [momentDate, setMomentDate] = useState(null);
  const disabled = moment().valueOf() < boss.respawnTime;

  const onChange = useCallback((value) => {
    setMomentDate(value ? moment(value).seconds(0) : value);
  }, []);

  const onKillClick = useCallback(async () => {
    const date = moment().seconds(0).toISOString();
    const newBossApiInfo = await updateBossTime(boss.id, date, false);
    const bossNewData = expandBoss(newBossApiInfo);

    updateBossList(bossNewData);
  }, [boss.id, updateBossList]);

  const onConfirmClick = useCallback(async () => {
    if (!momentDate) return;

    const newBossApiInfo = await updateBossTime(
      boss.id,
      moment(momentDate).toISOString(),
      false
    );
    const bossNewData = expandBoss(newBossApiInfo);

    updateBossList(bossNewData);
    setMomentDate(null);
  }, [boss.id, momentDate, updateBossList]);

  return !boss.world ? (
    <Space size="middle">
      <Button disabled={disabled} onClick={onKillClick}>
        Убили
      </Button>
      <DatePicker
        showTime
        value={momentDate}
        onChange={onChange}
        showSecond={false}
        format="DD-MM-YYYY HH:mm"
      />
      <Button
        shape="circle"
        disabled={!momentDate}
        onClick={onConfirmClick}
        icon={<UploadOutlined />}
      ></Button>
    </Space>
  ) : null;
};
