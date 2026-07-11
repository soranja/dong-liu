import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';

const COLUMN_COUNT = 56;
const WATERFALL_WIDTH_PERCENT = 90;
const WATERFALL_INSET_PERCENT = (100 - WATERFALL_WIDTH_PERCENT) / 2;
const ROGUE_DROPS = Array.from({ length: 14 }, (_, drop) => ({
  position: ((drop * 17 + 9) % COLUMN_COUNT) + 1,
}));

type EmittedDrop = (typeof ROGUE_DROPS)[number] & { id: number; size: number };

type WaterfallProps = {
  active: boolean;
};

export const DrippingTrack = ({ active }: WaterfallProps) => {
  const [drops, setDrops] = useState<EmittedDrop[]>([]);
  const surfaceRef = useRef<HTMLElement>(null);
  const nextDropRef = useRef(0);

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const fitToViewport = () => {
      const top = surface.getBoundingClientRect().top;
      surface.style.height = `${Math.max(0, window.innerHeight - top)}px`;
    };

    fitToViewport();
    window.addEventListener('resize', fitToViewport);
    return () => {
      window.removeEventListener('resize', fitToViewport);
    };
  }, []);

  useEffect(() => {
    if (!active) return;

    const emitDrop = () => {
      const source = ROGUE_DROPS[nextDropRef.current % ROGUE_DROPS.length];
      const id = nextDropRef.current;
      nextDropRef.current += 1;
      const size = 0.5 + Math.random() * 1.5;
      setDrops((current) => [...current, { ...source, id, size }]);
    };

    emitDrop();
    const emitter = window.setInterval(emitDrop, 180);
    return () => window.clearInterval(emitter);
  }, [active]);

  return (
    <section
      ref={surfaceRef}
      aria-label="Interactive typographic waterfall"
      className={`waterfall${active ? ' waterfall--active' : ''}`}
    >
      <div aria-hidden="true" className="waterfall__stream">
        {drops.map((drop) => (
          <Fragment key={drop.id}>
            <span
              className="waterfall__drip"
              style={{
                height: `${drop.size}rem`,
                left: `${WATERFALL_INSET_PERCENT + (drop.position / COLUMN_COUNT) * WATERFALL_WIDTH_PERCENT}%`,
                width: `${drop.size * 2.5}rem`,
              }}
            />
            <span
              className="waterfall__drop waterfall__drop--rogue"
              onAnimationEnd={() => {
                setDrops((current) => current.filter((candidate) => candidate.id !== drop.id));
              }}
              style={{
                animationDelay: '200ms',
                animationDuration: '700ms',
                height: `${drop.size}rem`,
                left: `${WATERFALL_INSET_PERCENT + (drop.position / COLUMN_COUNT) * WATERFALL_WIDTH_PERCENT}%`,
                width: `${drop.size}rem`,
                zIndex: drop.position % 2 === 0 ? 10 : 0,
              }}
            />
          </Fragment>
        ))}
      </div>
    </section>
  );
};
