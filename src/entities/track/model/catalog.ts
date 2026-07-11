import type { TrackSummary } from './types';

export const TRACKS = [
  {
    id: 'ram-box',
    trackNo: 1,
    route: '/tracks/ram-box',
    slug: 'ram-box',
    title: 'RAM — Бокс · prod. by disqonnect',
    cover: {
      alt: 'RAM — Бокс cover artwork',
      src: '/images/covers/ram-box.webp',
    },
  },
] as const satisfies readonly TrackSummary[];
