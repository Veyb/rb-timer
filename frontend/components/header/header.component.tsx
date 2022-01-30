import moment from 'moment';
import { useEffect, useState } from 'react';
import styles from './header.module.css';

export const Header = () => {
  const [time, setTime] = useState(moment().format('HH:mm'));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(moment().format('HH:mm'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.holder}>
        <h2 className={styles.time}>{time}</h2>
      </div>
    </header>
  );
};
