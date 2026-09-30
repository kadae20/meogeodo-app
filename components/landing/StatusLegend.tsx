const ITEMS = [
  {
    name: "내 기준 통과",
    example: "언스위트 아몬드 · 아이",
    swatch: "bg-emerald-500",
    line: "적어 둔 당류·원재료와 표시가 어긋나지 않음. 먹어도 된다는 뜻이 아닙니다.",
  },
  {
    name: "확인 필요",
    example: "언스위트 아몬드 · 성인",
    swatch: "bg-amber-400",
    line: "숫자는 있는데 1회 제공량처럼 한 번에 끝내지 못한 항목이 있음.",
  },
  {
    name: "내 기준과 충돌",
    example: "포도맛 젤리 · 아이",
    swatch: "bg-red-500",
    line: "피하기로 적어 둔 원재료나 한도가 원재료명·영양에 있음.",
  },
  {
    name: "정보 부족",
    example: "닭가슴살 소시지 · 성인",
    swatch: "bg-sky-500",
    line: "그 기준을 보려면 필요한 표시가 없음. 없는 내용을 채우지 않습니다.",
  },
];

export function StatusLegend() {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ITEMS.map((item) => (
        <li
          key={item.name}
          className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          <div className={`w-1.5 shrink-0 ${item.swatch}`} />
          <div className="p-4">
            <p className="font-landing-mono text-[11px] text-slate-400">{item.example}</p>
            <p className="mt-1 text-sm font-semibold">{item.name}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{item.line}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
