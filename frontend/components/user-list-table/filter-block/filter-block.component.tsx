// global modules
import { Button } from 'antd';
import styled from 'styled-components';
import { ChangeEvent, FormEvent, useCallback, useState } from 'react';

// local modules
import { Input } from '../../input';
import { Role } from '../../../types';
import { Select } from '../../../styled-components';

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
  roles: Role[];
  handleSearch: (value: string) => void;
  handleFilter: (value: any) => void;
}

export const FilterBlock = ({
  roles,
  handleSearch,
  handleFilter,
}: FilterBlockProps) => {
  const [value, setValue] = useState('');

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const onSearchClick = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimedValue = value.trim();
      setValue(trimedValue);
      handleSearch(trimedValue);
    },
    [handleSearch, value]
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
        mode="multiple"
        onChange={handleFilter}
        className={styles.filterBlock}
        defaultValue={roles.map((role) => role.name)}
      >
        {roles.map((role) => (
          <Select.Option key={role.id} value={role.name}>
            {role.name}
          </Select.Option>
        ))}
      </Select>
    </Holder>
  );
};
