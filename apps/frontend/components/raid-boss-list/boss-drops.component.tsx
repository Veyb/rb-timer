'use client';

// global modules
import { Spin } from 'antd';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import styled from 'styled-components';

// local modules
import { getBossDrops, IMAGE_URL } from '../../lib/api';
import type { BossDrop } from '../../types';

const Holder = styled.div`
  min-width: 34rem;
  max-height: 40rem;
  overflow-y: auto;

  & table {
    width: 100%;
    border-collapse: collapse;
    font-size: 1.2rem;
  }

  & td {
    padding: 0.3rem 0.6rem 0.3rem 0;
    vertical-align: middle;
    white-space: nowrap;
  }

  & .grade {
    color: rgba(255, 255, 255, 0.65);
  }

  & .icon {
    width: 2.4rem;
    padding-right: 0.8rem;
  }

  /* The only column allowed to give way when a name is long. */
  & .name {
    white-space: normal;
    width: 100%;
  }

  & .count,
  & .chance {
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.65);
  }

  & .empty {
    padding: 0.4rem 0;
  }
`;

/**
 * Formats a drop chance to two decimals: 37.7861 reads 37.79%, and 100 and 50
 * stay whole rather than becoming "100.00%".
 *
 * A rate that rounds to nothing is shown as a bound instead of as zero. One
 * drop in the catalogue is rarer than that — Erdrath's `Spellbook: Magician's
 * Will` at 0.0013% — and "0%" would say it never falls, which is the one thing
 * a drop table must not say about something that does.
 */
const formatChance = (chance: number) =>
  chance > 0 && chance < 0.005 ? '<0.01%' : `${Number(chance.toFixed(2))}%`;

const formatCount = (min: number, max: number) => (min === max ? `${min}` : `${min}–${max}`);

interface BossDropsProps {
  bossDocumentId: string;
  bossName: string;
}

/**
 * The drops of one boss, fetched when this mounts.
 *
 * Mounting is the trigger on purpose: the tooltip renders its content only
 * once opened, so hovering is what asks for the data, and a row nobody hovers
 * over costs nothing. Results are kept per boss so a second hover is instant.
 */
const cache = new Map<string, BossDrop[]>();

export const BossDrops = ({ bossDocumentId, bossName }: BossDropsProps) => {
  const [drops, setDrops] = useState<BossDrop[] | null>(() => cache.get(bossDocumentId) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (cache.has(bossDocumentId)) {
      setDrops(cache.get(bossDocumentId) ?? null);
      return;
    }

    let live = true;

    getBossDrops(bossDocumentId)
      .then((loaded) => {
        cache.set(bossDocumentId, loaded);
        if (live) setDrops(loaded);
      })
      .catch(() => {
        if (live) setFailed(true);
      });

    return () => {
      live = false;
    };
  }, [bossDocumentId]);

  if (failed) return <Holder>Не удалось загрузить дроп</Holder>;
  if (!drops) return <Spin size="small" />;
  if (!drops.length) return <Holder className="empty">{bossName} ничего не роняет</Holder>;

  return (
    <Holder>
      <table>
        <tbody>
          {drops.map((drop) => (
            <tr key={drop.documentId}>
              <td className="grade">{drop.item?.grade?.label ?? '—'}</td>
              <td className="icon">
                {drop.item?.icon ? (
                  <Image
                    src={`${IMAGE_URL}${drop.item.icon.url}`}
                    alt=""
                    width={24}
                    height={24}
                    unoptimized
                  />
                ) : null}
              </td>
              <td className="name">{drop.item?.name ?? '—'}</td>
              <td className="count">{formatCount(drop.minCount, drop.maxCount)}</td>
              <td className="chance">{formatChance(drop.chance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Holder>
  );
};
