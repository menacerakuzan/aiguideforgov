export function SkipLink({ targetId = 'main' }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="fixed top-5 left-5 z-[200] -translate-y-[170%] rounded-full bg-surface px-[22px] py-[13px] font-bold shadow-[0_12px_26px_-8px_rgba(38,34,74,0.14)] transition-transform duration-250 focus:translate-y-0"
    >
      Перейти до вмісту
    </a>
  );
}
