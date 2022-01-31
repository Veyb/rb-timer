// global modules
import { useCallback } from 'react';
import moment, { Moment } from 'moment';
import { Space, Button, DatePicker } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

// local modules
import { Boss } from '../../../../types';
import { updateBossTime } from '../../../../lib/api';

interface ActionsColumnProps {
  boss: Boss;
  editableTime: Moment | null;
  calendarDate: Moment | null;
  updateBossList: (boss: Boss) => void;
  handleConfirmClick: () => void;
  handleDatePickerChange: (value: any) => void;
}

export const ActionsColumn = ({
  boss,
  editableTime,
  calendarDate,
  updateBossList,
  handleConfirmClick,
  handleDatePickerChange,
}: ActionsColumnProps) => {
  const disabled = moment().valueOf() < boss.respawnTime;

  const onKillClick = useCallback(async () => {
    const date = moment().seconds(0).toISOString();
    const updatedBoss = await updateBossTime(boss.id, date, false);

    updateBossList(updatedBoss);
  }, [boss.id, updateBossList]);

  return !boss.world ? (
    <Space size="middle">
      <Button disabled={disabled} onClick={onKillClick}>
        Убили
      </Button>
      <DatePicker
        showTime
        showSecond={false}
        value={editableTime || calendarDate}
        format="DD-MM-YYYY HH:mm"
        onChange={handleDatePickerChange}
        placeholder={moment(boss.time).format('HH:mm')}
      />
      <Button
        shape="circle"
        disabled={!calendarDate && !editableTime}
        onClick={handleConfirmClick}
        icon={<UploadOutlined />}
      ></Button>
    </Space>
  ) : null;
};
