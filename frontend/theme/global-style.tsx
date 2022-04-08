import { createGlobalStyle, css } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  :root {
    font-size: 62.5%;
    --zIndexUnder: -1;
    --zIndexZero: 0;
    --zIndexBase: 1;
    --zIndexHigh: 2;
    --zIndexHighest: 3;
    --zIndexHeader: 4;
    --zIndexPopup: 5;
    --zIndexRoof: 100;
  }

  #__next {
    min-width: 58rem;
  }

  @media only screen and (min-width: 120em) {
    :root {
      font-size: 87.5%;
    }
  }

  html,
  body {
    margin: 0;
    padding: 0;
    font-size: 1.6rem;
    line-height: 1.3;
    background: #111113;
    color: rgba(255, 255, 255, 0.75);
    font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
      Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  * {
    box-sizing: border-box;
  }

  .ant-select-dropdown {
    padding: 0.4rem 0;
    font-size: 1.4rem;
    border-radius: 0.2rem;
  }

  .ant-select-item {
    min-height: 3.2rem;
    padding: 0.5rem 1.2rem;
    font-size: 1.4rem;
    line-height: 2.2rem;
  }
`;
