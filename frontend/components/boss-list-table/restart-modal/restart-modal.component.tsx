// global modules
import moment from 'moment';
import { useCallback, useState } from 'react';
import { UploadOutlined } from '@ant-design/icons';
import { Button, DatePicker, Modal } from 'antd';

// local modules
import { updateBossTime } from '../../../lib/api';
import { useBossContext } from '../../../contexts/boss-context';
import { useAuthContext } from '../../../contexts/auth-context';

// styles modules
import styles from './restart-modal.module.css';

interface RestartModalProps {
  visible: boolean;
  onClose: () => void;
}

export const RestartModal = ({ visible, onClose }: RestartModalProps) => {
  const { accessToken } = useAuthContext();
  const { bossList, allowedUpdate, updateBossInList } = useBossContext();
  const [calendarDate, setCalendarDate] = useState(null);

  const handleDatePickerChange = useCallback((value) => {
    setCalendarDate(value ? moment(value).seconds(0) : value);
  }, []);

  const handleResetClick = useCallback(async () => {
    if (confirm('Ты хорошо подумал? Если накосячишь, тебя вычислят ^_^')) {
      const filteredList = bossList.filter((boss) => !boss.world);

      filteredList.forEach(async (boss) => {
        const time = moment().seconds(0);
        const updatedBoss = await updateBossTime(
          boss.id,
          {
            time: time.add(-boss.interval, 'hours').toISOString(),
            approximately: false,
            restarted: true,
          },
          accessToken
        );

        updateBossInList(updatedBoss, true);
        onClose();
      });
    }
  }, [accessToken, bossList, updateBossInList, onClose]);

  const handleConfirmClick = useCallback(async () => {
    if (!calendarDate) return;
    const filteredList = bossList.filter(
      (boss) => !boss.world && boss.restarted
    );

    filteredList.forEach(async (boss) => {
      const calendarTime = moment(calendarDate).seconds(0);
      const diff = boss.firstInterval
        ? boss.firstInterval - boss.interval
        : undefined;
      const time = diff
        ? calendarTime.add(diff, 'hours').toISOString()
        : calendarTime.toISOString();

      console.log(boss.name, diff, moment(time).format('DD-MM-YYYY HH:mm'));

      const updatedBoss = await updateBossTime(
        boss.id,
        { time, approximately: true },
        accessToken
      );

      updateBossInList(updatedBoss, true);
      setCalendarDate(null);
      onClose();
    });
  }, [accessToken, calendarDate, bossList, updateBossInList, onClose]);

  return (
    <Modal
      centered
      title="Рестарт"
      visible={visible}
      onCancel={onClose}
      footer={null}
    >
      <p>
        Кнопка «Сброс» выставляет время респа для всех боссов на текущее время и
        ставит на паузу таймер автоматического обновления.
      </p>
      <p>
        Поле ввода служит для корректировки времени респа нереснувшихся боссов.
        Заполнить это поле надо лишь один раз, когда станет известно время
        рестарта сервера.
      </p>
      <p>
        Выяснить время рестарта можно дождавшись респауна босса после рестарта и
        вычесть из этого времени интервал появления босса.
      </p>
      <div className={styles.buttonsBlock}>
        <Button className={styles.resetButton} onClick={handleResetClick}>
          Сброс
        </Button>
        <DatePicker
          showTime
          showSecond={false}
          format="DD-MM-YYYY HH:mm"
          className={styles.datePicker}
          placeholder="Время рестарта"
          value={calendarDate}
          onChange={handleDatePickerChange}
        />
        <Button
          shape="circle"
          disabled={!allowedUpdate || !calendarDate}
          onClick={handleConfirmClick}
          icon={<UploadOutlined />}
        />
      </div>
    </Modal>
  );
};
