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
import styles from './form-login.module.css';

const FormLogin = () => {
  const router = useRouter();
  const { login } = useAuthContext();
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [userData, setUserData] = useState({
    identifier: '',
    password: '',
  });

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      try {
        await login(userData);
        router.replace('/');
      } catch (error: any) {
        setErrorMessage(error.message);
      }
    },
    [login, router, userData]
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
      <Space direction="vertical" size="large" className={styles.wrapper}>
        <h1 className={styles.header}>Вход</h1>
        <Input
          type="text"
          name="identifier"
          value={userData.identifier}
          onChange={handleChange}
          label="Username или e-mail"
          isFocused
        />

        <Input
          type="password"
          name="password"
          value={userData.password}
          onChange={handleChange}
          label="Пароль"
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
          Вход
        </Button>

        <Link href="/register">
          <a className={styles.link}>Регистрация</a>
        </Link>
      </Space>
    </form>
  );
};

export default FormLogin;
