// global modules
import { Modal } from 'antd';
import moment from 'moment';
import 'moment/locale/ru';
import { useRouter } from 'next/router';
import { useCallback, useState } from 'react';

// local modules
import { useAuthContext } from '../../contexts/auth-context';
import { deleteUser, updateUser } from '../../lib/api';
import { Button, Select } from '../../styled-components';
import { Role, User } from '../../types';

// style modules
import styles from './management-block.module.css';

interface ManagementBlockProps {
  user: User;
  roles: Role[];
}

export const ManagementBlock = (props: ManagementBlockProps) => {
  const router = useRouter();
  const { accessToken, allowedAdminister } = useAuthContext();
  const [user, setUser] = useState(props.user);
  const [deleteModal, setDeleteModal] = useState(false);
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

  const handleDelete = useCallback(async () => {
    await deleteUser(`${user.id}`, accessToken).then((res) => {
      router.replace('/users');
    });
  }, [accessToken, router, user]);

  return (
    <>
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
          <div>
            {`Дата регистрации: ${moment(user.createdAt)
              .locale('ru')
              .format('DD MMMM YYYY в HH:mm')}`}
          </div>
          {allowedAdminister && (
            <Button
              className={styles.deleteBtn}
              onClick={() => setDeleteModal(true)}
            >
              Удалить
            </Button>
          )}
        </div>

        <Button
          type="primary"
          onClick={handleUpdateClick}
          disabled={info.roleId === user.role.id}
        >
          Сохранить
        </Button>
      </div>

      <Modal
        centered
        title="Удаление"
        visible={deleteModal}
        onCancel={() => setDeleteModal(false)}
        footer={<Button onClick={handleDelete}>Да, удалить</Button>}
      >
        <p>
          {`Уверен, что хочешь удалить профиль пользователя `}
          <strong>{user.nickname}</strong>?
        </p>
      </Modal>
    </>
  );
};
