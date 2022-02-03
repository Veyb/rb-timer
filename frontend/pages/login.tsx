// global modules
import { FormLogin } from '../components/form-login';
import { useAuthContext } from '../contexts/auth-context';

// style modules
import styles from '../styles/main.module.css';

const Login = () => {
  const { loggedIn } = useAuthContext();

  return loggedIn ? (
    <div className={styles.container}>
      <div className={styles.authHolder}>
        <h2 style={{ margin: 0 }}>Вы авторизованы</h2>
      </div>
    </div>
  ) : (
    <div className={styles.container}>
      <div className={styles.authHolder}>
        <FormLogin />
      </div>
    </div>
  );
};

export default Login;
