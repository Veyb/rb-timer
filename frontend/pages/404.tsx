// global modules
import Image from 'next/image';

// style modules
import styles from '../styles/main.module.css';

export default function Custom404() {
  return (
    <div className={styles.container}>
      <div className={styles.notFoundHolder}>
        <h1>Страница не найдена</h1>
        <h4>
          По загадочным причинам такой страницы не существует или она в
          разработке ;)
        </h4>
        <Image src="/owl.png" alt="logo" width="400" height="400" />
      </div>
    </div>
  );
}
