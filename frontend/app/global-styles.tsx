'use client';

import { Normalize } from 'styled-normalize';

import { GlobalStyle } from '../theme/global-style';

export function GlobalStyles() {
  return (
    <>
      <Normalize />
      <GlobalStyle />
    </>
  );
}
