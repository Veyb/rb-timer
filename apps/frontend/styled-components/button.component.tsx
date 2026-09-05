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

  &.ant-btn-lg {
    height: 4rem;
    padding: 0.64rem 1.5rem;
    font-size: 1.6rem;
    border-radius: 0.2rem;
  }

  &.ant-btn-icon-only {
    width: 3.2rem;
    height: 3.2rem;
    padding: 0.24rem 0;
    font-size: 1.6rem;
    border-radius: 0.2rem;
    vertical-align: -0.3rem;
  }

  &.ant-btn-icon-only > * {
    font-size: 1.6rem;
  }

  &.ant-btn-circle {
    min-width: 3.2rem;
    border-radius: 50%;
  }

  &.ant-btn-round {
    border-radius: 3.2rem;
  }

  &.ant-btn-round.ant-btn-lg {
    height: 4rem;
    padding: 0.64rem 2rem;
    font-size: 1.6rem;
    border-radius: 4rem;
  }

  &.ant-btn-round.ant-btn-sm {
    height: 2.4rem;
    padding: 0 1.2rem;
    font-size: 1.4rem;
    border-radius: 2.4rem;
  }

  &.ant-btn-icon-only.ant-btn-lg {
    width: 4rem;
    height: 4rem;
    padding: 0.49rem 0;
    font-size: 1.8rem;
    border-radius: 0.2rem;
  }

  &.ant-btn-circle.ant-btn-lg {
    min-width: 4rem;
    border-radius: 50%;
  }

  &.ant-btn-icon-only.ant-btn-sm {
    width: 2.4rem;
    height: 2.4rem;
    padding: 0 0;
    font-size: 1.4rem;
    border-radius: 0.2rem;
  }

  &.ant-btn-circle.ant-btn-sm {
    min-width: 2.4rem;
    border-radius: 50%;
  }
`;
