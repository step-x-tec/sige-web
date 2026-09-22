const toneStyles: Record<string, string> = {
  neutral: 'bg-rule/60 text-ink',
  active: 'bg-chalk/40 text-board-dark',
  done: 'bg-board/10 text-board-dark',
  alert: 'bg-clay/10 text-clay',
};

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: keyof typeof toneStyles }) {
  return (
    <span className={`inline-flex items-center rounded-sige px-2 py-0.5 text-xs font-medium ${toneStyles[tone]}`}>
      {children}
    </span>
  );
}
