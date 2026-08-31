"use client";

import Section, { Reveal } from "@/components/ui/Section";
import { useLocale } from "@/components/LocaleProvider";
import {
  getData,
  fmt,
  formatDuration,
  groupByCompany,
  type Employment,
  type CareerEntry,
} from "@/lib/career";
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

/** 技術スタックのタグ列 */
function Stack({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-4 flex flex-wrap gap-x-2 gap-y-2">
      {items.map((s) => (
        <li
          key={s}
          className="rounded border border-line/70 bg-surface/40 px-2 py-1 font-mono text-[10.5px] text-muted transition-colors duration-300 group-hover:border-line group-hover:text-ink/70"
        >
          {s}
        </li>
      ))}
    </ul>
  );
}

/**
 * 会社1社ぶん。担当プロダクトが複数あれば、会社を見出しにしてその下に並べる。
 *
 * 以前は担当プロダクトごとに1件として並べていたが、同じ会社名が縦に3回続き
 * 「3社在籍した」ようにも読めてしまっていた。
 */
function CompanyBlock({
  group,
  index,
}: {
  group: ReturnType<typeof groupByCompany>[number];
  index: number;
}) {
  const { locale } = useLocale();
  const active = group.end === null;
  const multi = group.items.length > 1;

  return (
    <Reveal delay={Math.min(index, 4) * 0.05}>
      <article className="group relative grid gap-4 border-t border-line py-9 md:grid-cols-[132px_1fr] md:gap-10">
        <span className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-ember/60 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />

        <div className="font-mono text-[11px] leading-relaxed text-faint">
          <div className="text-ember/80">{fmt(group.start, locale)}</div>
          {/* 開始と終了が同じ月なら重ねて出さない */}
          {group.start !== group.end && (
            <>
              <div className="my-1 h-3 w-px bg-line md:my-1.5" />
              <div className={active ? "text-ink/70" : undefined}>
                {fmt(group.end, locale)}
              </div>
            </>
          )}
          <div className="mt-2 text-[10px] text-faint/70">
            {formatDuration(group.start, group.end, locale)}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3 className="font-display text-[clamp(1.05rem,2.4vw,1.5rem)] font-medium tracking-tight text-ink">
              {group.company}
            </h3>
            {active && <ActiveBadge />}
          </div>

          {multi ? (
            /* 担当プロダクトが複数。会社の下に時系列で並べる */
            <ol className="mt-6 space-y-7 border-l border-line pl-5">
              {group.items.map((item) => (
                <li key={item.start} className="relative">
                  {/* 各プロダクトの起点を示す小さな点 */}
                  <span className="absolute top-[7px] -left-[23px] h-1.5 w-1.5 rounded-full bg-line ring-4 ring-void" />
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h4 className="text-[14.5px] font-medium text-ember/90">
                      {item.product ?? group.company}
                    </h4>
                    <span className="font-mono text-[10px] text-faint">
                      {fmt(item.start, locale)} – {fmt(item.end, locale)}
                    </span>
                  </div>
                  <p className="mt-2.5 max-w-2xl text-[13.5px] leading-[1.95] text-ink/70">
                    {item.description}
                  </p>
                  <Stack items={item.stack} />
                </li>
              ))}
            </ol>
          ) : (
            <>
              {group.items[0].product && (
                <p className="mt-1.5 text-[13px] text-ember/75">
                  {group.items[0].product}
                </p>
              )}
              <p className="mt-4 max-w-2xl text-[13.5px] leading-[1.95] text-ink/70">
                {group.items[0].description}
              </p>
              <Stack items={group.items[0].stack} />
            </>
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
        {groupByCompany(entries).map((g, i) => (
          <li key={`${g.company}-${g.start}`}>
            <CompanyBlock group={g} index={i} />
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
