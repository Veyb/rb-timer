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
import styles from './form-register.module.css';

const FormRegister = () => {
  const router = useRouter();
  const { register } = useAuthContext();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    password: '',
    nickname: '',
    realname: '',
  });

  const handleSubmit = useCallback(
    async (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();

      try {
        await register(userData);
        router.replace('/');
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : String(error));
      }
    },
    [register, router, userData],
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
        <h1 className={styles.header}>Регистрация</h1>
        <Input
          type="text"
          name="username"
          value={userData.username}
          onChange={handleChange}
          label="Username авторизации"
          isFocused
          data-testid={TEST_IDS.registerForm.username}
        />

        <Input
          type="text"
          name="email"
          value={userData.email}
          onChange={handleChange}
          label="E-mail авторизации"
          data-testid={TEST_IDS.registerForm.email}
        />

        <Input
          type="password"
          name="password"
          value={userData.password}
          onChange={handleChange}
          label="Пароль"
          data-testid={TEST_IDS.registerForm.password}
        />

        <Input
          type="text"
          name="nickname"
          value={userData.nickname}
          onChange={handleChange}
          label="Имя персонажа"
          data-testid={TEST_IDS.registerForm.nickname}
        />

        <Input
          type="text"
          name="realname"
          value={userData.realname}
          onChange={handleChange}
          label="Ваше имя"
          data-testid={TEST_IDS.registerForm.realname}
        />
      </div>

      <ErrorDivider message={errorMessage} />

      <div className={styles.buttonHolder}>
        <Button
          size="large"
          htmlType="submit"
          disabled={disabled}
          className={styles.button}
          data-testid={TEST_IDS.registerForm.submit}
        >
          Регистрация
        </Button>

        <Link href="/login" className={styles.link}>
          Вход
        </Link>
      </div>
    </form>
  );
};

export default FormRegister;
