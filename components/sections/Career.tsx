"use client";

import Section, { Reveal } from "@/components/ui/Section";
import { useLocale } from "@/components/LocaleProvider";
import { getData, fmt, type Employment, type CareerEntry } from "@/lib/career";
import { UI } from "@/lib/i18n";

/** 進行中を示すバッジ。琥珀のドットが静かに脈打つ */
function ActiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-active/35 bg-active/10 px-2.5 py-0.5">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-active opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-active" />
      </span>
      <span className="font-mono text-[9px] tracking-[0.18em] text-active uppercase">
        Active
      </span>
    </span>
  );
}

function Entry({ entry, index }: { entry: CareerEntry; index: number }) {
  const { locale } = useLocale();
  const active = entry.end === null;

  return (
    <Reveal delay={Math.min(index, 4) * 0.05}>
      <article className="group relative grid gap-4 border-t border-line py-9 md:grid-cols-[132px_1fr] md:gap-10">
        <span className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-ember/60 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />

        <div className="font-mono text-[11px] leading-relaxed text-faint">
          <div className="text-ember/80">{fmt(entry.start, locale)}</div>
          {/* 開始と終了が同じ月なら「2022.08 〜 2022.08」と重ねて出さない */}
          {entry.start !== entry.end && (
            <>
              <div className="my-1 h-3 w-px bg-line md:my-1.5" />
              <div className={active ? "text-ink/70" : undefined}>
                {fmt(entry.end, locale)}
              </div>
            </>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3 className="font-display text-[clamp(1.05rem,2.4vw,1.5rem)] font-medium tracking-tight text-ink">
              {entry.company}
            </h3>
            {active && <ActiveBadge />}
          </div>

          {entry.product && (
            <p className="mt-1.5 text-[13px] text-ember/75">{entry.product}</p>
          )}

          <p className="mt-4 max-w-2xl text-[13.5px] leading-[1.95] text-ink/70">
            {entry.description}
          </p>

          {entry.stack.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-x-2 gap-y-2">
              {entry.stack.map((s) => (
                <li
                  key={s}
                  className="rounded border border-line/70 bg-surface/40 px-2 py-1 font-mono text-[10.5px] text-muted transition-colors duration-300 group-hover:border-line group-hover:text-ink/70"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>
    </Reveal>
  );
}

/** 雇用形態ごとの塊。見出しに件数と進行中の数を出す */
function Group({
  label,
  sub,
  entries,
}: {
  label: string;
  sub: string;
  entries: CareerEntry[];
}) {
  const { locale } = useLocale();
  if (entries.length === 0) return null;
  const activeCount = entries.filter((e) => e.end === null).length;

  return (
    <div className="mb-16 last:mb-0">
      <Reveal>
        <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h3 className="font-display text-[1.15rem] font-medium tracking-tight text-ink">
            {label}
          </h3>
          {/* 英語では見出しそのものが Full-time / Contract なのでサブラベルは出ない */}
          {sub && (
            <span className="font-mono text-[10px] tracking-[0.22em] text-faint uppercase">
              {sub}
            </span>
          )}
          <span className="ml-auto font-mono text-[10px] text-faint">
            {UI[locale].count(entries.length)}
            {activeCount > 0 && (
              <span className="ml-2 text-active/85">/ {activeCount} active</span>
            )}
          </span>
        </div>
      </Reveal>
      <ol>
        {entries.map((entry, i) => (
          <li key={`${entry.company}-${entry.start}`}>
            <Entry entry={entry} index={i} />
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Career() {
  const { locale } = useLocale();
  const t = UI[locale];

  // 雇用形態が時系列で混ざると、どれが本業か読み取れない。
  // 形態ごとに分けたうえで、それぞれを新しい順に並べる。
  // 該当が無い形態は Group 側で描画されない
  const entries = getData(locale).career;
  const by = (...kinds: Employment[]) =>
    entries.filter((e) => kinds.includes(e.employment));

  // データは4値で正確に持ちつつ、表示は3グループに束ねる。
  // アルバイトとインターンは各1件しかなく、独立した見出しにすると
  // 1件だけのセクションが並んで間延びする。
  // 職務経歴書の原典も、この2件を「その他の経歴」でまとめている
  return (
    <Section id="career" index="02" label="Career">
      <Group label={t.fulltime.label} sub={t.fulltime.sub} entries={by("fulltime")} />
      <Group label={t.contract.label} sub={t.contract.sub} entries={by("contract")} />
      <Group label={t.other.label} sub={t.other.sub} entries={by("parttime", "intern")} />
    </Section>
  );
}
