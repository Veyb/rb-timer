// global modules
import Link from 'next/link';
import { Button, Space } from 'antd';
import { useRouter } from 'next/router';
import { ChangeEvent, FormEvent, useCallback, useMemo, useState } from 'react';

// local modules
import { Input } from '../input';
import { ErrorDivider } from '../error-divider';
import { useAuthContext } from '../../contexts/auth-context';

// style modules
import styles from './form-register.module.css';

const FormRegister = () => {
  const router = useRouter();
  const { register } = useAuthContext();
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    password: '',
    nickname: '',
    realname: '',
  });

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      try {
        await register(userData);
        router.replace('/');
      } catch (error: any) {
        setErrorMessage(error.message);
      }
    },
    [register, router, userData]
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setErrorMessage(undefined);
    setUserData({ ...userData, [name]: value });
  };

  const disabled = useMemo(
    () => !Object.values(userData).every((x) => x !== ''),
    [userData]
  );

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Space direction="vertical" size="middle" className={styles.wrapper}>
        <h1 className={styles.header}>Регистрация</h1>
        <Input
          type="text"
          name="username"
          value={userData.username}
          onChange={handleChange}
          label="Username авторизации"
          isFocused
        />

        <Input
          type="text"
          name="email"
          value={userData.email}
          onChange={handleChange}
          label="E-mail авторизации"
        />

        <Input
          type="password"
          name="password"
          value={userData.password}
          onChange={handleChange}
          label="Пароль"
        />

        <Input
          type="text"
          name="nickname"
          value={userData.nickname}
          onChange={handleChange}
          label="Имя персонажа"
        />

        <Input
          type="text"
          name="realname"
          value={userData.realname}
          onChange={handleChange}
          label="Ваше имя"
        />
      </Space>

      <ErrorDivider message={errorMessage} />

      <Space className={styles.buttonHolder} direction="vertical" size="large">
        <Button
          size="large"
          htmlType="submit"
          disabled={disabled}
          className={styles.button}
        >
          Регистрация
        </Button>

        <Link href="/login">
          <a className={styles.link}>Вход</a>
        </Link>
      </Space>
    </form>
  );
};

export default FormRegister;
