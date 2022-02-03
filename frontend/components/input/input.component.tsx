// global modules
import { Button } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { InputHTMLAttributes, useEffect, useRef, useState } from 'react';

// local modules
import { generateId } from '../../lib/generate-id';

// styles modules
import styles from './input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label: string;
  isFocused?: boolean;
}
export const Input = ({
  type: propsType,
  name,
  label,
  value,
  onChange,
  isFocused,
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
    <div>
      <div className={styles.inputHolder}>
        <input
          id={commonId}
          ref={refInput}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          className={styles.input}
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
        <label htmlFor={commonId} className={styles.label}>
          {label}
        </label>
      </div>
    </div>
  );
};
