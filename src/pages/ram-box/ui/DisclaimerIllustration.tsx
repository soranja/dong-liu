import "./disclaimer.css";

export const DisclaimerIllustration = () => (
  <article className="disclaimer-illustration mx-auto flex h-full max-h-[640px] w-full max-w-[960px] flex-col items-center justify-center gap-[clamp(0.75rem,3vh,2.5rem)] bg-(--color-bg) px-[clamp(2rem,8vw,8rem)] py-[clamp(1.5rem,6vh,5rem)] text-center text-(--color-text) max-sm:m-auto max-sm:h-auto max-sm:w-[calc(100%_-_2rem)] [font-family:var(--font-unbounded)]">
    <h2 className="text-[clamp(1rem,3vw,3rem)] font-bold leading-none">ДИСКЛЕЙМЕР</h2>

    <p className="max-w-3xl text-[clamp(0.55rem,1.5vw,1.4rem)] leading-[1.35]">
      Этот интерактивный опыт предназначен только для аудитории 18+ и может содержать ненормативную лексику.
    </p>

    <p className="max-w-3xl text-[clamp(0.55rem,1.5vw,1.4rem)] leading-[1.35]">
      Этот опыт также может включать мигающие световые эффекты или визуальные эффекты и не рекомендуется людям с
      фоточувствительными состояниями.
    </p>

    <p className="max-w-3xl text-[clamp(0.55rem,1.5vw,1.4rem)] leading-[1.35]">
      Все авторские права на музыку остаются за их соответствующими владельцами.
    </p>
  </article>
);
