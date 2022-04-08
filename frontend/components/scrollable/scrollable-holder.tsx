// global modules
import styled, { css } from 'styled-components';

export const zeroScrollbarStyle = css`
  -ms-overflow-style: none; // IE 10+
  scrollbar-width: none; // Firefox;

  &::-webkit-scrollbar {
    display: none; //Safari and Chrome
  }
`;

export interface ScrollableStyle {
  maxHeight?: string | number; // in rem
  offset?: number; // in rem
}

const omitProps: Record<string, boolean> = {
  maxHeight: true,
  offset: true,
};

export const ScrollThumb = styled('div')`
  width: 0;
  padding: 0 0.2rem;
  border-radius: 0.3rem;
  background-color: #dfdfe4;

  :hover,
  &.dragging {
    padding: 0 0.6rem;
    border-radius: 0.6rem;
  }
`;

export const ScrollableHolder = styled('div').withConfig({
  shouldForwardProp: (prop, defaultValidator) =>
    !omitProps[prop] && defaultValidator(prop),
})<ScrollableStyle>`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  ${(props) =>
    props.maxHeight
      ? typeof props.maxHeight === 'number'
        ? `max-height:${props.maxHeight}rem`
        : `max-height:${props.maxHeight}`
      : ''};

  .scrollHost {
    overflow-y: scroll;
    height: 100%;
    width: 100%;

    ${zeroScrollbarStyle};
    ${(props) =>
      props.maxHeight && typeof props.maxHeight === 'number'
        ? `max-height:${props.maxHeight}rem`
        : ''};
    ${({ offset }) => (offset ? `padding-right: ${offset}rem` : '')};
  }
  .scrollHost.scrollbarExist {
    padding-right: ${(props) => 1.2 + (props.offset || 0)}rem;
  }

  .scrollbar {
    position: absolute;
    height: 100%;
    top: 0;
    width: 1.2rem;
    display: none;
    z-index: var(--zIndexBase);
    right: ${(props) => props.offset || 0}rem;
  }

  .scrollbar.exist {
    display: block;
  }

  ${ScrollThumb} {
    position: absolute;
    right: 0.4rem;
  }
  ${ScrollThumb}:hover,
  .${ScrollThumb}.dragging {
    right: 0;
  }
`;
ScrollableHolder.displayName = 'ScrollableHolder';
