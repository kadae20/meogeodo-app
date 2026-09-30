export function StatusDots({ className = "" }: { className?: string }) {
  return (
    <div
      className={`landing-float w-[200px] rounded-[14px] border border-slate-200 bg-white p-3 pb-2.5 text-[13px] leading-[1.35] text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.16)] ${className}`}
      aria-label="쿠팡 페이지에 뜨는 가족별 검수 미리보기"
    >
      <p className="mb-2 text-[13px] font-bold text-[#047857]">먹어도될까</p>
      <ul>
        {[
          ["아이", "통과", "#10b981"],
          ["성인", "확인", "#f59e0b"],
          ["강아지", "제외", "#cbd5e1"],
        ].map(([name, st, color]) => (
          <li key={name} className="flex items-center justify-between gap-2 py-1">
            <span className="truncate font-semibold">{name}</span>
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="text-[10px] text-slate-500">{st}</span>
              <span
                className="h-3 w-3 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(15,23,42,0.15)]"
                style={{ background: color }}
              />
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 w-full rounded-lg bg-[#047857] py-1.5 text-center text-[12px] font-semibold text-white">
        자세히
      </div>
    </div>
  );
}
