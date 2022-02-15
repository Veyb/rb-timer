// global modules
import cn from 'classnames';
import { HTMLAttributes } from 'react';

// style modules
import styles from './layout.module.css';

interface LayoutProps extends HTMLAttributes<HTMLDivElement> {}

export const Layout = ({ className, ...rest }: LayoutProps) => {
  return <div className={cn(styles.layout, className)} {...rest} />;
};
