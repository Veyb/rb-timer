// global modules
import { Button } from 'antd';
import { type ChangeEvent, type SubmitEvent, useCallback, useState } from 'react';
import styled from 'styled-components';
import { TEST_IDS } from '../../../constants/test-ids';
import { Select } from '../../../styled-components';
import type { Role } from '../../../types';
// local modules
import { Input } from '../../input';

// style modules
import styles from './filter-block.module.css';

const Holder = styled.div`
  gap: 2rem;
  display: flex;
  margin-bottom: 2rem;
  justify-content: space-between;

  @media only screen and (max-width: 62em) {
    flex-direction: column;
  }
`;

interface FilterBlockProps {
  /**
   * The roles present among the members being filtered, not the ones an officer
   * may assign. A filter offers what is there: a member holding the
   * registration default — left by an operator, or by an officer's removal
   * elsewhere — appears in the list, so the filter has to be able to find them.
   */
  roles: Role[];
  handleSearch: (value: string) => void;
  handleFilter: (value: string | undefined) => void;
}

export const FilterBlock = ({ roles, handleSearch, handleFilter }: FilterBlockProps) => {
  const [value, setValue] = useState('');

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const onSearchClick = useCallback(
    (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimedValue = value.trim();
      setValue(trimedValue);
      handleSearch(trimedValue);
    },
    [handleSearch, value],
  );

  const onClear = useCallback(() => {
    setValue('');
    handleSearch('');
  }, [handleSearch]);

  return (
    <Holder>
      <form onSubmit={onSearchClick} className={styles.searchBlock}>
        <Input
          simple
          type="text"
          value={value}
          onClear={onClear}
          onChange={handleSearchChange}
          placeholder="Никнейм"
          className={styles.searchInput}
        />
        <Button htmlType="submit" className={styles.searchButton}>
          Поиск
        </Button>
      </form>

      <Select
        allowClear
        placeholder="Роль"
        onChange={(value) => handleFilter(value as string | undefined)}
        className={styles.filterBlock}
        popupMatchSelectWidth={false}
        placement="bottomLeft"
        data-testid={TEST_IDS.usersList.roleFilter}
      >
        {roles.map((role) => (
          <Select.Option key={role.type} value={role.name}>
            {role.name}
          </Select.Option>
        ))}
      </Select>
    </Holder>
  );
};
