import styled from 'styled-components';

export const Menu = styled.ul`
  position: relative;
  margin: 0;
  padding: 0.4rem 0;
  text-align: left;
  list-style-type: none;
  background-color: #1f1f1f;
  background-clip: padding-box;
  border-radius: 0.2rem;
  outline: none;
  box-shadow: 0 0.3rem 0.6rem -0.4rem rgb(0 0 0 / 48%),
    0 0.6rem 1.6rem 0 rgb(0 0 0 / 32%), 0 0.9rem 2.8rem 0.8rem rgb(0 0 0 / 20%);
`;

export const MenuDivider = styled.li`
  height: 0.1rem;
  margin: 0.4rem 0;
  overflow: hidden;
  line-height: 0;
  background-color: #303030;
`;

export const MenuItem = styled.li`
  position: relative;
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0.5rem 1.2rem;
  color: rgba(255, 255, 255, 0.85);
  font-weight: normal;
  font-size: 1.4rem;
  line-height: 2.2rem;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.08);
  }
`;
