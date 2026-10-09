"use client";

import { findingVisible, kindLabel, severityLabel, specialtyLabel, whenLabel, NOW_MINUTE } from "@/lib/data";
import { useStore } from "@/lib/store";
import type { Specialty } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Page, PageHeader, SeverityDot } from "@/components/system/primitives";

export function BodyTab({ patientId }: { patientId: string }) {
  const patient = useStore((s) => s.patients[patientId]);
  const view = useStore((s) => s.views[patientId]);
  const setView = useStore((s) => s.setView);
  const openTab = useStore((s) => s.openTab);
  if (!patient || !view) return null;

  const specialties: Specialty[] = ["all", ...patient.specialties];
  const visible = patient.findings
    .filter((f) => findingVisible(f, view.minute, view.specialty))
    .sort((a, b) => b.minute - a.minute);

  return (
    <Page>
      <PageHeader eyebrow={`${patient.mrn} · ${patient.age} ${patient.sex}`} title={patient.name}>
        {patient.summary}
      </PageHeader>

      <div className="mt-10 flex flex-wrap items-end gap-10 border-b border-hairline pb-6">
        <label className="grid gap-2">
          <span className="eyebrow">Specialty</span>
          <Select
            value={view.specialty}
            items={specialties.map((s) => ({ value: s, label: specialtyLabel[s] }))}
            onValueChange={(value) => value && setView(patientId, { specialty: value as Specialty })}
          >
            <SelectTrigger className="h-9 min-w-44 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {specialties.map((s) => (
                <SelectItem key={s} value={s}>
                  {specialtyLabel[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <div className="grid min-w-64 flex-1 gap-3">
          <span className="eyebrow flex justify-between">
            <span>Timeline</span>
            <span className="font-normal tracking-normal normal-case text-ink-soft">{whenLabel(view.minute)}</span>
          </span>
          <Slider
            value={[view.minute]}
            max={NOW_MINUTE}
            onValueChange={(value) => setView(patientId, { minute: Array.isArray(value) ? value[0]! : value })}
            aria-label="Timeline"
          />
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="grid aspect-[4/5] max-h-[560px] place-items-center rounded-xl bg-ivory">
          <div className="max-w-xs text-center">
            <p className="eyebrow">3D body</p>
            <p className="mt-3 font-serif text-xl text-jade-900">The anatomy view goes here</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-faint">
              It will mark the {visible.length} {visible.length === 1 ? "finding" : "findings"} listed beside it.
            </p>
          </div>
        </div>

        <div>
          <p className="eyebrow">
            {visible.length} {visible.length === 1 ? "finding" : "findings"} · {specialtyLabel[view.specialty]}
          </p>
          {visible.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">Nothing for this time and specialty. Move the timeline forward or choose All findings.</p>
          ) : (
            <ul className="mt-3 divide-y divide-hairline">
              {visible.map((finding) => (
                <li key={finding.id}>
                  <button
                    type="button"
                    onClick={() => openTab("region", patientId, finding.id)}
                    className="group grid w-full grid-cols-[auto_1fr] items-baseline gap-x-3 py-4 text-left"
                  >
                    <SeverityDot severity={finding.severity} className="translate-y-[-1px]" />
                    <span className="font-serif text-[18px] text-jade-900 group-hover:text-jade-600">{finding.title}</span>
                    <span />
                    <span className="mt-0.5 text-[13px] text-ink-soft">{finding.condition}</span>
                    <span />
                    <span className="mt-1 text-[11px] tracking-[0.1em] text-ink-faint uppercase">
                      {kindLabel[finding.kind]} · {severityLabel[finding.severity]} · {whenLabel(finding.minute)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Page>
  );
}
