// global modules

import { Button } from 'antd';
import cn from 'classnames';
import { type ChangeEvent, type SubmitEvent, useCallback, useState } from 'react';
import { useCollectionContext } from '../../../contexts/collection-context';
import type { FilterType } from '../../../types';
// local modules
import { Input } from '../../input';

// style modules
import styles from './filter-block.module.css';

interface FilterBlockProps {
  handleSearch: (value: string) => void;
}

interface Filter {
  name: string;
  type: FilterType;
}

const filters: Filter[] = [
  { name: 'Все', type: 'all' },
  { name: 'Не завершено', type: 'notFinished' },
  { name: 'Завершено', type: 'finished' },
];

export const FilterBlock = ({ handleSearch }: FilterBlockProps) => {
  const { filter, setFilter } = useCollectionContext();
  const [value, setValue] = useState('');

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
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
    <div className={styles.holder}>
      <form onSubmit={onSearchClick} className={styles.searchBlock}>
        <Input
          simple
          type="text"
          value={value}
          onClear={onClear}
          onChange={handleChange}
          placeholder="Название предмета"
          className={styles.searchInput}
        />
        <Button htmlType="submit" className={styles.searchButton}>
          Поиск
        </Button>
      </form>

      <div className={styles.filterBlock}>
        {filters.map(({ name, type }) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilter(type)}
            className={cn(styles.filterButton, { [styles.active]: type === filter })}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
};
