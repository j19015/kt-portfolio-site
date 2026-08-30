"use client";

import Section, { Reveal } from "@/components/ui/Section";
import { DATA } from "@/lib/career";

export default function Next() {
  return (
    <Section id="next" index="04" label="What's Next">
      <Reveal>
        <p className="max-w-2xl text-[clamp(0.95rem,1.9vw,1.15rem)] leading-[2.1] text-ink/85">
          {DATA.profile.next}
        </p>
      </Reveal>
    </Section>
  );
}
