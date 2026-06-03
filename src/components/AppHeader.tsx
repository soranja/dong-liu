import type { RefObject } from "react";

type AppHeaderProps = {
  headerRef: RefObject<HTMLElement | null>;
};

export const AppHeader = ({ headerRef }: AppHeaderProps) => {
  return (
    <header
      ref={headerRef}
      className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-between border-b border-(--color-border) bg-(--color-panel) px-4 text-(--color-text) sm:px-6"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center border border-(--color-border-strong) bg-(--color-panel-raised) font-mono text-xs font-bold text-(--color-text)">
          W
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-mono text-lg font-bold leading-none text-(--color-text) sm:text-xl">DONGAMP</h1>
          <p className="truncate font-mono text-[11px] uppercase leading-tight text-(--color-text-muted)">
            Scroll page, dock stays
          </p>
        </div>
      </div>

      <div className="hidden items-center gap-2 font-mono text-xs text-(--color-text-muted) sm:flex">
        <span className="border border-(--color-border-soft) bg-(--color-panel-chip) px-2 py-1">44 KHZ</span>
        <span className="border border-(--color-border-soft) bg-(--color-panel-chip) px-2 py-1">STEREO</span>
      </div>
    </header>
  );
};
