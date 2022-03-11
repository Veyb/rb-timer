// global modules
import moment from 'moment';
import 'moment/locale/ru';
import { useCallback, useState } from 'react';

// local modules
import { useAuthContext } from '../../contexts/auth-context';
import { updateUser } from '../../lib/api';
import { Button, Select } from '../../styled-components';
import { Role, User } from '../../types';

// style modules
import styles from './management-block.module.css';

interface ManagementBlockProps {
  user: User;
  roles: Role[];
}

export const ManagementBlock = (props: ManagementBlockProps) => {
  const { accessToken, allowedAdminister } = useAuthContext();
  const [user, setUser] = useState(props.user);
  const [info, setInfo] = useState({ roleId: props.user.role.id });

  const handleSelectChange = useCallback(
    (value) => {
      setInfo({ ...info, roleId: value });
    },
    [info]
  );

  const handleUpdateClick = useCallback(async () => {
    await updateUser(user.id, { role: info.roleId }, accessToken).then(
      (response) => setUser(response)
    );
  }, [accessToken, info, user]);

  return (
    <div className={styles.holder}>
      <div className={styles.wrapper}>
        <div>{`Имя: ${user.realname}`}</div>
        <div>{`Никнейм: ${user.nickname}`}</div>
        <div className={styles.role}>
          <span>Роль:</span>
          {allowedAdminister ? (
            <Select
              size="small"
              bordered={false}
              onChange={handleSelectChange}
              disabled={!allowedAdminister}
              defaultValue={user.role.id}
              dropdownMatchSelectWidth={false}
            >
              {props.roles.map((role) => (
                <Select.Option key={role.id} value={role.id}>
                  {role.name}
                </Select.Option>
              ))}
            </Select>
          ) : (
            <span>{user.role.name}</span>
          )}
        </div>
        <div>{`Дата регистрации: ${moment(user.createdAt)
          .locale('ru')
          .format('DD MMMM YYYY в HH:mm')}`}</div>
      </div>
      <Button
        onClick={handleUpdateClick}
        disabled={info.roleId === user.role.id}
      >
        Сохранить
      </Button>
    </div>
  );
};
