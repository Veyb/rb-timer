'use client';

// global modules
import { Table, Tag, Tooltip } from 'antd';
import Image from 'next/image';
import styled from 'styled-components';

// local modules
import { IMAGE_URL } from '../../lib/api';
import type { RaidBoss } from '../../types';
import { Layout } from '../layout';
import { BossDrops } from './boss-drops.component';

const Holder = styled.div`
  & .avatarCell {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  & .avatar {
    border-radius: 0.4rem;
    background-color: #1f1f1f;
  }

  & .epic {
    margin-left: 0.8rem;
  }
`;

interface RaidBossListProps {
  list: RaidBoss[];
}

/**
 * A table row that shows the boss's drops while the pointer rests on it.
 *
 * Wrapping the row rather than a cell: the whole row is the target, which is
 * what a reader aims at. antd hands a custom row its `data-row-key`, and that
 * key is the boss's `documentId` — enough to ask for the drops without
 * threading the record down through the table.
 *
 * `mouseEnterDelay` keeps a pointer crossing the table on its way elsewhere
 * from firing a request per row it passes over.
 */
const DropsRow = ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => {
  const documentId = (props as Record<string, unknown>)['data-row-key'];
  const boss = typeof documentId === 'string' ? byId.get(documentId) : undefined;

  if (!boss) return <tr {...props}>{children}</tr>;

  return (
    <Tooltip
      // Not `right`: the row spans the table, so its right edge is already at
      // the viewport's and antd shifts the tooltip off-screen rather than
      // flipping it — the grade, count and chance columns were cut off. `top`
      // centres it over a row that is far wider than the tooltip.
      placement="top"
      // antd caps a tooltip at 250px, which wrapped every second item name onto
      // a third line. Widened to fit the drop table rather than lifted: the cap
      // is what gives the tooltip a width at all, and `none` stretched it to a
      // million pixels.
      styles={{ root: { maxWidth: '36rem' }, container: { maxWidth: 'none' } }}
      mouseEnterDelay={0.35}
      title={<BossDrops bossDocumentId={boss.documentId} bossName={boss.name} />}
    >
      <tr {...props}>{children}</tr>
    </Tooltip>
  );
};

/**
 * The rows antd is rendering, by key. A custom row component receives only its
 * key, and this is how it gets back to the record — cheaper than re-deriving a
 * row component for every render of the list.
 */
const byId = new Map<string, RaidBoss>();

/**
 * Schematic on purpose. This exists to prove a visitor with no session reaches
 * the catalogue end to end — the product's boss page, with its detail and its
 * map, is a later change. Nothing here is meant to survive it except the fact
 * that the request works.
 */
export const RaidBossList = ({ list }: RaidBossListProps) => {
  byId.clear();
  for (const boss of list) byId.set(boss.documentId, boss);

  return (
    <Holder>
      <Layout>
        <h1>Рейдовые боссы</h1>
        <p>{list.length} боссов</p>

        <Table<RaidBoss>
          rowKey="documentId"
          components={{ body: { row: DropsRow } }}
          dataSource={list}
          pagination={{ pageSize: 50, showSizeChanger: false }}
          columns={[
            {
              title: '',
              dataIndex: 'avatar',
              width: 56,
              render: (_, boss) =>
                boss.avatar?.mini ? (
                  <Image
                    className="avatar"
                    src={`${IMAGE_URL}${boss.avatar.mini.url}`}
                    alt=""
                    width={40}
                    height={40}
                  />
                ) : null,
            },
            {
              title: 'Имя',
              dataIndex: 'name',
              render: (_, boss) => (
                <span className="avatarCell">
                  {boss.name}
                  {boss.epic && (
                    <Tag className="epic" color="gold">
                      epic
                    </Tag>
                  )}
                </span>
              ),
            },
            { title: 'Уровень', dataIndex: 'level', width: 100 },
            {
              title: 'Грейд',
              dataIndex: 'grade',
              width: 100,
              render: (_, boss) => boss.grade?.label ?? '—',
            },
            {
              title: 'Локация',
              dataIndex: 'location',
              render: (_, boss) => boss.location?.name ?? '—',
            },
          ]}
        />
      </Layout>
    </Holder>
  );
};
