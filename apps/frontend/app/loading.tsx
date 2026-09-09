'use client';

// global modules
import { Spin } from 'antd';

// style modules
import styles from '../styles/main.module.css';

/**
 * Shown while a route's data is still being fetched.
 *
 * Every page here awaits its data before rendering anything, so without a
 * boundary a navigation left the previous screen on show until the request
 * came back — the app looked frozen rather than busy. This is the framework's
 * own Suspense boundary for a route segment.
 */
export default function Loading() {
  return (
    <div className={styles.infoHolder}>
      <Spin size="large" />
    </div>
  );
}
