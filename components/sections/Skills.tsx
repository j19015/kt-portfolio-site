"use client";

import Section, { Reveal } from "@/components/ui/Section";
import { useLocale } from "@/components/LocaleProvider";
import { getData } from "@/lib/career";
import { TECH_ICONS } from "@/lib/tech-icons";

/**
 * アイコンの有無にかかわらず同じ幅の箱を置いて行頭を揃える。
 * 高さを 1lh にしてあるので、狭い画面でラベルが折り返しても1行目に揃ったままになる。
 */
const GLYPH_BOX = "flex h-[1lh] w-[15px] shrink-0 items-center justify-center";

function SkillGlyph({ name }: { name: string }) {
  const icon = TECH_ICONS[name];

  // ロゴが存在しない技術（AWS CDK / Auth.js / AutoGen など）。
  // 箱は残して小さな点だけ置く。欠けが穴に見えず、箇条書きの中黒として読める
  if (!icon) {
    return (
      <span aria-hidden className={GLYPH_BOX}>
        <span className="size-[3px] rounded-full bg-faint transition-colors duration-300 group-hover/skill:bg-ember" />
      </span>
    );
  }

  return (
    <span aria-hidden className={GLYPH_BOX}>
      <svg
        viewBox="0 0 24 24"
        className="size-[15px] fill-current text-ink/50 transition-colors duration-300 group-hover/skill:text-[var(--brand)]"
      >
        <path d={icon.path} />
      </svg>
    </span>
  );
}

export default function Skills() {
  // 分類名も項目名も英語なので、いまのところ日英で中身は変わらない
  const { locale } = useLocale();

  return (
    <Section id="skills" index="03" label="Skills">
      <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
        {getData(locale).skills.map((group, i) => (
          <Reveal key={group.category} delay={(i % 3) * 0.06}>
            <div className="group">
              <h3 className="font-mono text-[10px] tracking-[0.28em] text-ember/85 uppercase">
                {group.category}
              </h3>
              <span className="mt-3 mb-4 block h-px w-full bg-line transition-colors duration-500 group-hover:bg-ember/30" />
              <ul className="flex flex-wrap gap-x-4 gap-y-2.5">
                {group.items.map((item) => (
                  <li
                    key={item}
                    // ブランド色が出るのはホバーした一項目だけ。既定は単色に揃えてトーンを保つ
                    style={
                      {
                        "--brand": TECH_ICONS[item]?.color,
                      } as React.CSSProperties
                    }
                    className="group/skill flex items-start gap-[7px] text-[12.5px] text-ink/75 transition-colors duration-300 hover:text-ember"
                  >
                    <SkillGlyph name={item} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
