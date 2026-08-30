"use client";

import Section, { Reveal } from "@/components/ui/Section";
import { DATA } from "@/lib/career";

export default function Skills() {
  return (
    <Section id="skills" index="03" label="Skills">
      <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
        {DATA.skills.map((group, i) => (
          <Reveal key={group.category} delay={(i % 3) * 0.06}>
            <div className="group">
              <h3 className="font-mono text-[10px] tracking-[0.28em] text-ember/85 uppercase">
                {group.category}
              </h3>
              <span className="mt-3 mb-4 block h-px w-full bg-line transition-colors duration-500 group-hover:bg-ember/30" />
              <ul className="flex flex-wrap gap-x-3 gap-y-2">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="text-[12.5px] text-ink/75 transition-colors duration-300 hover:text-ember"
                  >
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
