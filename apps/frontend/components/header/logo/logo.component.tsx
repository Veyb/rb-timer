// global modules
import styled from 'styled-components';

const maskImage = "url('/logo-lu4.svg')";

const Holder = styled.span`
  display: block;

  aspect-ratio: 47 / 31;
  height: 3rem;

  background-color: currentColor;

  mask-image: ${maskImage};
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: contain;

  -webkit-mask-image: ${maskImage};
  -webkit-mask-position: center;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: contain;
`;

export const Logo = () => <Holder aria-hidden />;
