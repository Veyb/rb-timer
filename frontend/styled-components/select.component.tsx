import styled from 'styled-components';
import { Select as AntSelect } from 'antd';

export const Select = styled(AntSelect)`
  &.ant-select {
    font-size: 1.4rem;
  }

  &.ant-select-selector {
    padding: 0.1rem 0.4rem;
    border-width: 0.1rem;
  }

  &.ant-select-multiple .ant-select-selector {
    padding: 0.1rem 0.4rem;
  }

  &.ant-select-selection-item {
    height: 2.4rem;
    margin-top: 0.2rem;
    line-height: 2.2rem;
    border-width: 0.1rem;
    border-radius: 0.2rem;
  }

  &.ant-select-multiple .ant-select-selection-item {
    height: 2.4rem;
    margin-top: 0.2rem;
    margin-bottom: 0.2rem;
    line-height: 2.2rem;
    border-width: 0.1rem
    border-radius: 0.2rem;
    -webkit-margin-end: 0.4rem;
    margin-inline-end: 0.4rem;
    -webkit-padding-start: 0.8rem;
    padding-inline-start: 0.8rem;
    -webkit-padding-end: 0.4rem;
    padding-inline-end: 0.4rem;
}

  &.ant-select-selection-item-remove {
    font-size: 1rem;
  }

  &.ant-select-multiple .ant-select-selection-item-remove {
    font-size: 1rem;
  }

  & .ant-select-arrow {
    right: 1.1rem;
    width: 1.2rem;
    height: 1.2rem;
    margin-top: -0.6rem;
    font-size: 1.2rem;
  }

  &.ant-select-single.ant-select-sm:not(.ant-select-customize-input)
    .ant-select-selector {
    padding: 0 0.7rem;
  }

  &.ant-select-single.ant-select-sm:not(.ant-select-customize-input)
    .ant-select-selector {
    height: 2.4rem;
  }

  &.ant-select:not(.ant-select-customize-input) .ant-select-selector {
    border-width: 0.1rem;
    border-radius: 0.2rem;
  }

  &.ant-select-single:not(.ant-select-customize-input) .ant-select-selector {
    height: 3.2rem;
    padding: 0 1.1rem;
  }

  &.ant-select-single.ant-select-sm:not(.ant-select-customize-input).ant-select-show-arrow
    .ant-select-selection-search {
    right: 2.8rem;
  }

  &.ant-select-single.ant-select-sm:not(.ant-select-customize-input)
    .ant-select-selection-search {
    right: 0.7rem;
    left: 0.7rem;
  }

  &.ant-select-single.ant-select-show-arrow .ant-select-selection-search {
    right: 2.5rem;
  }

  &.ant-select-single .ant-select-selector .ant-select-selection-search {
    position: absolute;
    top: 0;
    right: 1.1rem;
    bottom: 0;
    left: 1.1rem;
  }

  &.ant-select-single:not(.ant-select-customize-input)
    .ant-select-selector
    .ant-select-selection-search-input {
    height: 3rem;
  }

  &.ant-select-single.ant-select-sm:not(.ant-select-customize-input):not(.ant-select-customize-input)
    .ant-select-selection-search-input {
    height: 2.2rem;
  }

  &.ant-select-single.ant-select-sm:not(.ant-select-customize-input).ant-select-show-arrow
    .ant-select-selection-item,
  &.ant-select-single.ant-select-sm:not(.ant-select-customize-input).ant-select-show-arrow
    .ant-select-selection-placeholder {
    padding-right: 2.1rem;
  }

  &.ant-select-single.ant-select-show-arrow .ant-select-selection-item,
  &.ant-select-single.ant-select-show-arrow .ant-select-selection-placeholder {
    padding-right: 1.8rem;
  }

  &.ant-select-single .ant-select-selector .ant-select-selection-item,
  &.ant-select-single .ant-select-selector .ant-select-selection-placeholder {
    line-height: 3rem;
  }

  &.ant-select-single.ant-select-sm:not(.ant-select-customize-input)
    .ant-select-selector::after,
  &.ant-select-single.ant-select-sm:not(.ant-select-customize-input)
    .ant-select-selector
    .ant-select-selection-item,
  &.ant-select-single.ant-select-sm:not(.ant-select-customize-input)
    .ant-select-selector
    .ant-select-selection-placeholder {
    line-height: 2.2rem;
  }
`;
