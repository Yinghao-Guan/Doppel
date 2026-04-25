"use client";

/**
 * PERSON 3 — user profile inputs. Edits the global store directly.
 */

import { User } from "lucide-react";
import { useAthleteStore } from "@/lib/store/useAthleteStore";
import type { FitnessLevel, Goal } from "@/types";

export function ProfileForm() {
  const profile = useAthleteStore((s) => s.profile);
  const setProfile = useAthleteStore((s) => s.setProfile);
  if (!profile) return null;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <User className="w-4 h-4 text-accent" />
        <h2 className="h-section text-white">Athlete Profile</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Age">
          <input
            type="number"
            value={profile.age}
            onChange={(e) =>
              setProfile({ ...profile, age: Number(e.target.value) })
            }
            className={inputCls}
          />
        </Field>
        <Field label="Weight (kg)">
          <input
            type="number"
            value={profile.weightKg}
            onChange={(e) =>
              setProfile({ ...profile, weightKg: Number(e.target.value) })
            }
            className={inputCls}
          />
        </Field>
        <Field label="Height (cm)">
          <input
            type="number"
            value={profile.heightCm}
            onChange={(e) =>
              setProfile({ ...profile, heightCm: Number(e.target.value) })
            }
            className={inputCls}
          />
        </Field>
        <Field label="Sleep (hrs)">
          <input
            type="number"
            value={profile.sleepHours}
            onChange={(e) =>
              setProfile({ ...profile, sleepHours: Number(e.target.value) })
            }
            className={inputCls}
          />
        </Field>
        <Field label="Sessions / week">
          <input
            type="number"
            value={profile.trainingFrequency}
            onChange={(e) =>
              setProfile({ ...profile, trainingFrequency: Number(e.target.value) })
            }
            className={inputCls}
          />
        </Field>
        <Field label="Level">
          <select
            value={profile.fitnessLevel}
            onChange={(e) =>
              setProfile({ ...profile, fitnessLevel: e.target.value as FitnessLevel })
            }
            className={inputCls}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </Field>
        <Field label="Goal" full>
          <select
            value={profile.goal}
            onChange={(e) =>
              setProfile({ ...profile, goal: e.target.value as Goal })
            }
            className={inputCls}
          >
            <option value="strength">Strength</option>
            <option value="endurance">Endurance</option>
            <option value="weight_loss">Weight Loss</option>
            <option value="mobility">Mobility</option>
          </select>
        </Field>
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent";

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={full ? "col-span-2" : ""}>
      <div className="text-xs text-muted mb-1">{label}</div>
      {children}
    </label>
  );
}
