// global modules
import { useCallback } from 'react';
import moment, { Moment } from 'moment';
import { Space, Button, DatePicker } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

// local modules
import { Boss } from '../../../../types';
import { updateBossTime } from '../../../../lib/api';
import { useBossContext } from '../../../../contexts/boss-context';
import { useAuthContext } from '../../../../contexts/auth-context';

interface ActionsColumnProps {
  boss: Boss;
  editableTime: Moment | null;
  calendarDate: Moment | null;
  handleConfirmClick: () => void;
  handleDatePickerChange: (value: any) => void;
}

export const ActionsColumn = ({
  boss,
  editableTime,
  calendarDate,
  handleConfirmClick,
  handleDatePickerChange,
}: ActionsColumnProps) => {
  const { accessToken, allowedUpdate } = useAuthContext();
  const { updateBossInList } = useBossContext();
  const disabled = moment().valueOf() < boss.respawnTime || !allowedUpdate;

  const onKillClick = useCallback(async () => {
    if (!allowedUpdate) return;

    const time = moment().seconds(0).toISOString();
    const updatedBoss = await updateBossTime(
      boss.id,
      { time, approximately: false },
      accessToken
    );

    updateBossInList(updatedBoss);
  }, [boss.id, allowedUpdate, updateBossInList, accessToken]);

  return !boss.world ? (
    <Space size="middle">
      <Button disabled={disabled} onClick={onKillClick}>
        Убили
      </Button>
      <DatePicker
        showTime
        showSecond={false}
        disabled={!allowedUpdate}
        value={editableTime || calendarDate}
        format="DD-MM-YYYY HH:mm"
        onChange={handleDatePickerChange}
        placeholder={moment(boss.time).format('HH:mm')}
      />
      <Button
        shape="circle"
        disabled={(!calendarDate && !editableTime) || !allowedUpdate}
        onClick={handleConfirmClick}
        icon={<UploadOutlined />}
      ></Button>
    </Space>
  ) : null;
};
