// global modules
import cn from 'classnames';
import { Button } from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { InputHTMLAttributes, useEffect, useRef, useState } from 'react';

// local modules
import { generateId } from '../../lib/generate-id';

// styles modules
import styles from './input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  simple?: boolean;
  isFocused?: boolean;
  onClear?: () => void;
}
export const Input = ({
  type: propsType,
  name,
  label,
  value,
  onClear,
  onChange,
  simple,
  isFocused,
  placeholder,
  className,
}: InputProps) => {
  const isPassword = propsType === 'password';
  const [visible, setVisible] = useState(propsType !== 'password');
  const [commonId] = useState(() => generateId());
  const refInput = useRef<HTMLInputElement>(null);
  const type = isPassword ? (visible ? 'text' : 'password') : propsType;

  useEffect(() => {
    if (isFocused && refInput.current) {
      refInput.current.focus();
    }
  }, [isFocused]);

  return (
    <div
      className={cn(
        styles.inputHolder,
        { [styles.simple]: simple },
        { [styles.withouLabel]: !label },
        className
      )}
    >
      <input
        id={commonId}
        ref={refInput}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className={cn(styles.input, {
          [styles.withIcon]: isPassword || !!onClear,
        })}
        placeholder={placeholder}
      />
      {isPassword && (
        <div className={styles.asideHolder}>
          <Button
            className={styles.iconButton}
            onClick={() => setVisible(!visible)}
            icon={visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          ></Button>
        </div>
      )}
      {!!onClear && (
        <div className={styles.asideHolder}>
          <Button
            className={styles.iconButton}
            onClick={() => onClear()}
            icon={<CloseCircleOutlined />}
          ></Button>
        </div>
      )}
      {label && (
        <label htmlFor={commonId} className={styles.label}>
          {label}
        </label>
      )}
    </div>
  );
};
