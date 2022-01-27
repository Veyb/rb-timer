import { Table } from 'antd';

import { Boss } from '../../types';
import { NameColumn } from './name-column.component';
import { ActionsColumn } from './actions-column.component';
import { RespawnTimeColumn } from './respawn-time-column.component';

import styles from './boss-list-table.module.css';

interface BossListTableProps {
  bossList: Boss[];
  updateBossList: (boss: Boss) => void;
}

export const BossListTable = ({
  bossList,
  updateBossList,
}: BossListTableProps) => {
  return (
    <Table
      pagination={false}
      className={styles.table}
      dataSource={bossList.map((boss) => ({ ...boss, key: boss.id }))}
    >
      <Table.Column
        key="name"
        dataIndex="name"
        title="Имя"
        align="left"
        sorter={{
          compare: (a, b) => a.name.localeCompare(b.name),
        }}
        render={(name: string, record: Boss) => <NameColumn boss={record} />}
      />
      <Table.Column
        key="respawnTime"
        dataIndex="respawnTime"
        title="Время"
        align="center"
        defaultSortOrder="ascend"
        sorter={{
          compare: (a, b) => a.respawnTime - b.respawnTime,
        }}
        render={(respawnTime: string, record: Boss) => (
          <RespawnTimeColumn boss={record} updateBossList={updateBossList} />
        )}
      />
      <Table.Column
        key="actions"
        title="Действия"
        align="center"
        width={410}
        className={styles.actionsColumn}
        render={(text, record: Boss) => (
          <ActionsColumn boss={record} updateBossList={updateBossList} />
        )}
      />
    </Table>
  );
};
