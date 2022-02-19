// local modules
import { Rank } from './collections-block.types';

export function getRankColor(rank: Rank) {
  switch (rank) {
    case 'common':
      return '#a2a2ad';
    case 'rare':
      return '#458828';
    case 'unique':
      return '#1765ad';
    case 'epic':
      return '#a61d24';
    case 'legend':
      return '#854eca';
  }
}
