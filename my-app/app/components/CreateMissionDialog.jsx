"use client";

import "../styles/componentsDesign/CreateMissionDialog.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@headlessui/react";
import { useForm, useWatch } from "react-hook-form";
import ConfigPicker from './ConfigPicker';
import MapPicker from "./MapPicker";
import PersonPicker from "./PersonPicker";

/* ───────────────────────────────────────────────────────────────
   Wizard steps + validation
   ─────────────────────────────────────────────────────────────── */
const steps = ["Name","Start Time","Duration","Location","Soldiers","Commanders","Configuration"];
const requiredPerStep = {
  0: ["missionName"],
  1: ["StartTime"],
  2: ["Duration"],
  3: ["location.lat", "location.lng"],
  4: ["soldiers"],
  5: ["commanders"],
  6: ["Configuration"],
};
const isObjectId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);

/* configs loader (expects [{_id,name}] or {configs:[…]}) */
function useConfigs() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const r = await fetch("/api/configs", { cache: "no-store" });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        const list = Array.isArray(data) ? data : (data.configs || []);
        if (!ignore) setConfigs(list);
      } catch (e) {
        if (!ignore) setErr(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  return { configs, loading, err };
}

export default function CreateMissionDialog({ isOpen, onClose }) {
  const router = useRouter();
  const { configs, loading: cfgLoading, err: cfgErr } = useConfigs();

  const {
    register, handleSubmit, watch, setValue, reset, control, trigger, getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      missionName: "",
      StartTime: "",
      Duration: "01:00",
      location: { lat: 31.7717, lng: 35.217, address: "" },
      soldiers: [],
      commanders: [],
      Configuration: "",
    },
    mode: "onChange",
    reValidateMode: "onChange",
    shouldUnregister: false,
  });

  const [step, setStep] = useState(0);

  const isCurrentStepValid = useCallback(async () => {
    const names = requiredPerStep[step] || [];
    if (!names.length) return true;

    const ok = await trigger(names, { shouldFocus: true });
    if (!ok) return false;

    const hasValue = (v) => {
      if (Array.isArray(v)) return v.length > 0;
      if (v && typeof v === "object") return Object.values(v).every(x => x !== null && x !== undefined && x !== "");
      return v !== null && v !== undefined && String(v).trim() !== "";
    };
    return names.every((path) => hasValue(getValues(path)));
  }, [step, trigger, getValues]);

  const next = async () => { if (await isCurrentStepValid()) setStep((s) => Math.min(s + 1, steps.length - 1)); };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  useWatch({ control, name: Object.values(requiredPerStep).flat() });
  const completeUpTo = useMemo(() => {
    const done = new Set();
    for (let i = 0; i < steps.length; i++) {
      const names = requiredPerStep[i] || [];
      const ok = names.every((n) => {
        const v = getValues(n);
        if (Array.isArray(v)) return v.length > 0;
        if (v && typeof v === "object") return Object.values(v).every((x) => x !== null && x !== undefined && x !== "");
        return v !== null && v !== undefined && String(v).trim() !== "";
      });
      if (ok) done.add(i);
    }
    return done;
  }, [getValues]);

  /* Keep the confirm close ONLY on the X button */
  const handleClose = () => confirm("Discard all entered data?") && (reset(), setStep(0), onClose?.());

  /* NO-OP on overlay click or ESC */
  const noop = () => {};

  const onSubmit = async (raw) => {
    try {
      if (!isObjectId(raw.Configuration)) { alert("Please select a valid configuration."); setStep(6); return; }
      const [h, m] = (raw.Duration || "0:0").split(":").map(Number);
      const durationSec = (h || 0) * 3600 + (m || 0) * 60;

      const payload = {
        missionName: raw.missionName,
        StartTime:   new Date(raw.StartTime),
        Duration:    durationSec,
        Location:    {
          name: raw.location?.address || "UnNamed Point",
          lat:  Number(raw.location?.lat),
          lon:  Number(raw.location?.lng),
        },
        Soldiers:      raw.soldiers,
        Commanders:    raw.commanders,
        Configuration: raw.Configuration,
        Log:           null,
        IsFinished:    false,
      };

      const res = await fetch("/api/missionFunctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      alert("Mission created ✔️");
      router.refresh();
      reset(); setStep(0); onClose?.();
    } catch (err) {
      alert("Error: " + (err?.message || err));
    }
  };

  return (
    <Dialog open={isOpen} onClose={noop} className="cmd-dialog">
      <div className="cmd-backdrop" aria-hidden="true" />

      <div className="cmd-container">
        <Dialog.Panel
          className="cmd-panel glass-card"
          /* swallow Esc entirely at panel level too */
          onKeyDownCapture={(e) => {
            if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); }
          }}
        >
          <button className="cmd-close" onClick={handleClose} aria-label="Close dialog">✕</button>
          <Dialog.Title className="cmd-title">Create Mission</Dialog.Title>

          {/* Stepper */}
          <nav className="cmd-steps" aria-label="Wizard progress">
            {steps.map((label, i) => (
              <button
                key={label}
                type="button"
                className={`cmd-step ${i === step ? "is-active" : ""} ${completeUpTo.has(i) ? "is-done" : ""}`}
                onClick={async () => { if (i <= step || await isCurrentStepValid()) setStep(i); }}
              >
                <span className="cmd-dot" />
                <span className="cmd-step-label">{label}</span>
              </button>
            ))}
          </nav>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="cmd-form"
            noValidate
            /* block Enter everywhere in the form */
            onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
          >
            {step === 0 && (
              <div className="cmd-field">
                <label className="cmd-label" htmlFor="missionName">Mission Name</label>
                <input id="missionName" className="cmd-input" placeholder="e.g., Dawn Watch Alpha"
                  {...register("missionName", { required: "Enter a mission name" })} autoFocus />
                {errors.missionName && <span className="cmd-error">{errors.missionName.message}</span>}
              </div>
            )}

            {step === 1 && (
  <div className="cmd-field">
    <label className="cmd-label" htmlFor="StartTime">Start Time</label>
    <input
      id="StartTime"
      type="datetime-local"
      className="cmd-input"
      /* prevent past times */
      min={new Date().toISOString().slice(0, 16)}
      {...register("StartTime", {
        required: "Pick a start time",
        validate: (v) => {
          const dt = new Date(v);
          return dt.getTime() >= Date.now() || "Start time must be in the future";
        },
      })}
    />
    {errors.StartTime && <span className="cmd-error">{errors.StartTime.message}</span>}
  </div>
)}

            {step === 2 && (
              <div className="cmd-field">
                <label className="cmd-label" htmlFor="Duration">Duration (HH:MM)</label>
                <input id="Duration" type="time" step="60" className="cmd-input"
                  {...register("Duration", {
                    required: "Duration is required",
                    pattern: { value: /^\d{2}:\d{2}$/, message: "Use HH:MM" },
                  })} />
                {errors.Duration && <span className="cmd-error">{errors.Duration.message}</span>}
              </div>
            )}

            {step === 3 && (
              <MapPicker
                value={watch("location")}
                onChange={(loc) => setValue("location", loc, { shouldValidate: true })}
              />
            )}

            {step === 4 && (
              <div className="cmd-field">
                <label className="cmd-label">Pick Soldiers</label>
                <PersonPicker
                  role="Soldier"
                  values={watch("soldiers")}
                  setValues={(ids) => setValue("soldiers", ids, { shouldValidate: true })}
                />
                {errors.soldiers && <span className="cmd-error">Pick at least one soldier</span>}
              </div>
            )}

            {step === 5 && (
              <div className="cmd-field">
                <label className="cmd-label">Pick Commanders</label>
                <PersonPicker
                  role="Commander"
                  values={watch("commanders")}
                  setValues={(ids) => setValue("commanders", ids, { shouldValidate: true })}
                />
                {errors.commanders && <span className="cmd-error">Pick at least one commander</span>}
              </div>
            )}

            {step === 6 && (
  <div className="cmd-field">
    <label className="cmd-label" htmlFor="Configuration">Pick Configuration</label>

    {/* Optional legacy error display; ConfigPicker fetches internally */}
    {cfgErr && (
      <div className="cmd-error" style={{ marginBottom: 6 }}>
        Failed to load configurations. {String(cfgErr?.message || cfgErr)}
      </div>
    )}

    {/* Fancy card picker (shows GMK/FHF function names, interval, etc.) */}
    <ConfigPicker
      value={watch('Configuration') || ''}
      onChange={(id) => setValue('Configuration', id, { shouldValidate: true })}
    />

    {/* Keep RHF validation exactly as before */}
    <input
      type="hidden"
      id="Configuration"
      {...register('Configuration', {
        required: 'Select a configuration',
        validate: (v) => isObjectId(v) || 'Invalid selection',
      })}
    />

    {errors.Configuration && (
      <span className="cmd-error">{errors.Configuration.message}</span>
    )}
  </div>
)}

            <div className="cmd-nav">
              <button type="button" className="cmd-btn" onClick={prev} disabled={step === 0 || isSubmitting}>◀ Back</button>
              {step < steps.length - 1 ? (
                <button type="button" className="cmd-btn cmd-primary" onClick={next} disabled={isSubmitting}>Next ▶</button>
              ) : (
                <button type="submit" className="cmd-btn cmd-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Creating…" : "Create ✔"}
                </button>
              )}
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
