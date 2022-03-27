// global modules
import cn from 'classnames';
import { Button } from 'antd';
import { ChangeEvent, FormEvent, useCallback, useState } from 'react';

// local modules
import { Input } from '../../input';
import { FilterType } from '../../../types';
import { useCollectionContext } from '../../../contexts/collection-context';

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
          <span
            key={type}
            onClick={() => setFilter(type)}
            className={cn({ [styles.active]: type === filter })}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
};
