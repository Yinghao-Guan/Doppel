"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/profile-store";
import type {
  ExperienceLevel,
  Gender,
  ProfileFields,
  WorkoutType,
} from "@/types/predict";

type Props = {
  open: boolean;
  onClose: () => void;
};

const GENDERS: Gender[] = ["Male", "Female", "Other"];
const EXPERIENCE: ExperienceLevel[] = ["Beginner", "Intermediate", "Advanced"];
const WORKOUTS: WorkoutType[] = ["Strength", "Cardio", "HIIT", "Yoga", "Mixed"];

const DEFAULTS: ProfileFields = {
  Age: 24,
  Gender: "Other",
  Height: 175,
  Weight: 72,
  Workout_Frequency: 4,
  Experience_Level: "Intermediate",
  Workout_Type: "Strength",
};

export function ProfileDrawer({ open, onClose }: Props) {
  const { profile, setProfile } = useProfile();
  const [draft, setDraft] = useState<ProfileFields>({ ...DEFAULTS, ...profile });
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft({ ...DEFAULTS, ...profile });
  }, [profile, open]);

  useEffect(() => {
    if (!open) return;
    if (!sheetRef.current || !backdropRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: "power2.out" },
      );
      gsap.fromTo(
        sheetRef.current,
        { y: 60, opacity: 0, filter: "blur(10px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.55,
          ease: "power3.out",
        },
      );
      gsap.from(".pd-field", {
        opacity: 0,
        y: 12,
        stagger: 0.04,
        duration: 0.45,
        delay: 0.15,
        ease: "power3.out",
      });
    });
    return () => ctx.revert();
  }, [open]);

  if (!open) return null;

  function update<K extends keyof ProfileFields>(k: K, v: ProfileFields[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function handleSave() {
    setProfile(draft);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        ref={backdropRef}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />

      <div
        ref={sheetRef}
        className="glass-strong relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-7 py-5">
          <div>
            <p className="eyebrow">Profile · model input</p>
            <h2 className="font-display mt-1 text-2xl text-[var(--fg)]">
              Tell your twin who you are.
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-[var(--glass-border)] p-2 text-[var(--fg-dim)] transition-colors hover:text-[var(--fg)]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-5 p-7 sm:grid-cols-2">
          <Field className="pd-field" label="Age" sub="years">
            <input
              type="number"
              min={10}
              max={100}
              value={draft.Age}
              onChange={(e) => update("Age", Number(e.target.value))}
              className="input-base"
              aria-label="Age in years"
            />
          </Field>

          <Field className="pd-field" label="Gender">
            <Segmented
              options={GENDERS}
              value={draft.Gender}
              onChange={(v) => update("Gender", v)}
            />
          </Field>

          <Field className="pd-field" label="Height" sub="cm">
            <input
              type="number"
              min={120}
              max={230}
              value={draft.Height}
              onChange={(e) => update("Height", Number(e.target.value))}
              className="input-base"
              aria-label="Height in centimeters"
            />
          </Field>

          <Field className="pd-field" label="Weight" sub="kg">
            <input
              type="number"
              min={30}
              max={200}
              value={draft.Weight}
              onChange={(e) => update("Weight", Number(e.target.value))}
              className="input-base"
              aria-label="Weight in kilograms"
            />
          </Field>

          <Field
            className="pd-field sm:col-span-2"
            label="Workout frequency"
            sub={`${draft.Workout_Frequency} / week`}
          >
            <input
              type="range"
              min={1}
              max={7}
              step={1}
              value={draft.Workout_Frequency}
              onChange={(e) =>
                update("Workout_Frequency", Number(e.target.value))
              }
              className="doppel-slider w-full"
              aria-label="Workout frequency per week"
            />
            <div className="mt-1 flex justify-between font-mono text-[10px] tracking-[0.2em] text-[var(--fg-mute)]">
              <span>1</span>
              <span>7</span>
            </div>
          </Field>

          <Field className="pd-field" label="Experience">
            <Segmented
              options={EXPERIENCE}
              value={draft.Experience_Level}
              onChange={(v) => update("Experience_Level", v)}
            />
          </Field>

          <Field className="pd-field" label="Workout type">
            <Segmented
              options={WORKOUTS}
              value={draft.Workout_Type}
              onChange={(v) => update("Workout_Type", v)}
              compact
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--glass-border)] px-7 py-5">
          <button
            onClick={onClose}
            className="cta glass cta-ghost text-xs font-mono tracking-[0.2em] py-2 px-4"
          >
            CANCEL
          </button>
          <button onClick={handleSave} className="cta cta-primary">
            Save profile
          </button>
        </div>
      </div>

    </div>
  );
}

function Field({
  label,
  sub,
  children,
  className,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] tracking-[0.28em] text-[var(--fg-mute)]">
          {label.toUpperCase()}
        </span>
        {sub && (
          <span className="font-mono text-[10px] text-[var(--fg-dim)]">
            {sub}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  compact = false,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5 rounded-xl border border-[var(--glass-border)] bg-[var(--surface)]/40 p-1",
        compact && "p-1",
      )}
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 font-mono text-[11px] tracking-[0.18em] transition-all",
              active
                ? "text-[var(--fg)]"
                : "text-[var(--fg-mute)] hover:text-[var(--fg-dim)]",
            )}
            style={
              active
                ? {
                    background:
                      "linear-gradient(135deg,color-mix(in srgb,var(--accent) 30%, transparent),color-mix(in srgb,var(--accent-deep) 30%, transparent))",
                    boxShadow:
                      "inset 0 1px 0 0 rgba(255,255,255,0.15), 0 0 12px -4px var(--accent)",
                  }
                : undefined
            }
          >
            {opt.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
