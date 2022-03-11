import styled from 'styled-components';
import { Button as AntButton } from 'antd';

export const Button = styled(AntButton)`
  &.ant-btn {
    border-width: 0.1rem;
    height: 3.2rem;
    padding: 0.4rem 1.5rem;
    font-size: 1.4rem;
    border-radius: 0.2rem;
  }
  &.ant-btn-icon-only {
    width: 3.2rem;
    height: 3.2re;
    padding: 0.24rem 0;
    font-size: 1.6rem;
    border-radius: 0.2rem;
    vertical-align: -0.3rem;
  }
  &.ant-btn-icon-only > * {
    font-size: 1.6rem;
  }
`;
