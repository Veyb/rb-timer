'use client';

// global modules
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, type SubmitEvent, useCallback, useMemo, useState } from 'react';
import { TEST_IDS } from '../../constants/test-ids';
import { useAuthContext } from '../../contexts/auth-context';
import { Button } from '../../styled-components';
import { ErrorDivider } from '../error-divider';
// local modules
import { Input } from '../input';

// style modules
import styles from './form-login.module.css';

const FormLogin = () => {
  const router = useRouter();
  const { login } = useAuthContext();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [userData, setUserData] = useState({
    identifier: '',
    password: '',
  });

  const handleSubmit = useCallback(
    async (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();

      try {
        await login(userData);
        router.replace('/');
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : String(error));
      }
    },
    [login, router, userData],
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setErrorMessage(undefined);
    setUserData({ ...userData, [name]: value });
  };

  const disabled = useMemo(() => !Object.values(userData).every((x) => x !== ''), [userData]);

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.wrapper}>
        <h1 className={styles.header}>Вход</h1>
        <Input
          type="text"
          name="identifier"
          value={userData.identifier}
          onChange={handleChange}
          label="Username или e-mail"
          isFocused
          data-testid={TEST_IDS.loginForm.identifier}
        />

        <Input
          type="password"
          name="password"
          value={userData.password}
          onChange={handleChange}
          label="Пароль"
          data-testid={TEST_IDS.loginForm.password}
        />
      </div>

      <ErrorDivider message={errorMessage} />
      <div className={styles.buttonHolder}>
        <Button
          size="large"
          htmlType="submit"
          disabled={disabled}
          className={styles.button}
          data-testid={TEST_IDS.loginForm.submit}
        >
          Вход
        </Button>

        <Link href="/register" className={styles.link}>
          Регистрация
        </Link>
      </div>
    </form>
  );
};

export default FormLogin;
