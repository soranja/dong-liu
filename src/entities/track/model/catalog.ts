import type { TrackSummary } from './types';

export const TRACKS = [
  {
    id: 'ram-box',
    trackNo: 1,
    route: '/tracks/ram-box',
    title: 'RAM — Бокс · prod. by disqonnect',
    cover: {
      alt: 'RAM — Бокс',
      src: '/images/covers/ram-box.webp',
    },
  },
] as const satisfies readonly TrackSummary[];
