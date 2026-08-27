// global modules
import { useCallback } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { Space, Button, DatePicker } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

// local modules
import { Boss } from '../../../../types';
import { updateBossTime } from '../../../../lib/api';
import { useIsClient } from '../../../../lib/hooks/use-is-client';
import { useBossContext } from '../../../../contexts/boss-context';
import { useAuthContext } from '../../../../contexts/auth-context';

interface ActionsColumnProps {
  boss: Boss;
  editableTime: Dayjs | null;
  calendarDate: Dayjs | null;
  handleConfirmClick: () => void;
  handleDatePickerChange: (value: Dayjs | null) => void;
}

export const ActionsColumn = ({
  boss,
  editableTime,
  calendarDate,
  handleConfirmClick,
  handleDatePickerChange,
}: ActionsColumnProps) => {
  const mounted = useIsClient();
  const { accessToken, allowedUpdate } = useAuthContext();
  const { updateBossInList } = useBossContext();
  const disabled = dayjs().valueOf() < boss.respawnTime || !allowedUpdate;

  const onKillClick = useCallback(async () => {
    if (!allowedUpdate) return;

    const time = dayjs().second(0).toISOString();
    const updatedBoss = await updateBossTime(
      boss.documentId,
      { time, approximately: false },
      accessToken
    );

    updateBossInList(updatedBoss);
  }, [boss.documentId, allowedUpdate, updateBossInList, accessToken]);

  if (!mounted || boss.world) return null;

  return (
    <Space size="middle">
      <Button disabled={!boss.restarted && disabled} onClick={onKillClick}>
        Убили
      </Button>
      <DatePicker
        showTime
        showSecond={false}
        disabled={!allowedUpdate}
        value={editableTime || calendarDate}
        format="DD-MM-YYYY HH:mm"
        onChange={handleDatePickerChange}
        placeholder={dayjs(boss.time).format('HH:mm')}
      />
      <Button
        shape="circle"
        disabled={(!calendarDate && !editableTime) || !allowedUpdate}
        onClick={handleConfirmClick}
        icon={<UploadOutlined />}
      />
    </Space>
  );
};
