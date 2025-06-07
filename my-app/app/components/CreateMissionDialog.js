'use client';

import '../styles/componentsDesign/CreateMissionDialog.css';
import { useState }              from 'react';
import { useRouter }             from 'next/navigation';
import { Dialog }                from '@headlessui/react';
import { useForm, useWatch }     from 'react-hook-form';
import 'leaflet/dist/leaflet.css';

import MapPicker     from '../components/MapPicker';
import PersonPicker  from '../components/PersonPicker';
import ConfigPicker  from '../components/ConfigPicker';

/* ─── wizard steps ─── */
const steps = [
  'Name',          // 0
  'StartTime',     // 1
  'Duration',      // 2
  'Location',      // 3
  'Soldiers',      // 4
  'Commanders',    // 5
  'Configuration',
  'c',
  
];

/* ─── required fields per step ─── */
const requiredPerStep = [
  ['missionName'],                       // 0
  ['StartTime'],                         // 1
  ['Duration'],                          // 2
  ['location.lat', 'location.lng'],      // 3
  ['soldiers'],                          // 4
  ['commanders'],                        // 5
  ['Configuration'],    // 6
  ['c'],
                  
];

export default function CreateMissionDialog({ isOpen, onClose }) {
  /* form ---------------------------------------------------------- */
  const {
    register, handleSubmit, watch, setValue, reset, control, trigger,
    formState: { errors },
  } = useForm({
    defaultValues: {
      missionName: '',
      StartTime:   '',
      Duration:    '01:00',                          // HH:MM
      location:    { lat: 31.7717, lng: 35.217, address: '' },
      soldiers:    [],
      commanders:  [],
      Configuration: '',
      
    },
  });

  const router = useRouter();

  /* wizard nav ----------------------------------------------------- */
  const [step, setStep] = useState(0);
  const next = async () => {
    

    const valid = await trigger(requiredPerStep[step]);
    if (!valid) return;

    setStep(step + 1);
  };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  /* step-completion helper ---------------------------------------- */
  function useStepFilled(idx) {
    const names = requiredPerStep[idx];
    const vals  = useWatch({ control, name: names });

    return names.every((_, i) => {
      const v = Array.isArray(vals) ? vals[i] : vals;
      if (Array.isArray(v))     return v.length > 0;
      if (typeof v === 'object')return Object.values(v).every(Boolean);
      return Boolean(v);
    });
  }
  const stepFilled = useStepFilled(step);

  /* picker previews ------------------------------------------------ */
  const [selSoldiers,   setSelSoldiers]   = useState([]);
  const [selCommanders, setSelCommanders] = useState([]);

  /* helpers -------------------------------------------------------- */
  const closeAll = () => {
    reset();
    setSelSoldiers([]);
    setSelCommanders([]);
    setStep(0);
    onClose();
  };
  const handleClose = () =>
    confirm('Discard all entered data?') && closeAll();

  /* submit --------------------------------------------------------- */
  const onSubmit = async (raw) => {
    try {
      if (raw.soldiers.length === 0)   { alert('Pick at least one soldier');   return; }
      if (raw.commanders.length === 0) { alert('Pick at least one commander'); return; }

      /* HH:MM → seconds */
      const [h, m] = raw.Duration.split(':').map(Number);
      const durationSec = h * 3600 + m * 60;

      /* build payload that matches the Mission model */
      const payload = {
        missionName: raw.missionName,
        StartTime:   new Date(raw.StartTime),
        Duration:    durationSec,
        Location:    {
          name: raw.location.address || 'UnNamed Point',
          lat:  raw.location.lat,
          lon:  raw.location.lng,
        },
        Soldiers:     raw.soldiers,
        Commanders:   raw.commanders,
        Configuration: raw.Configuration,
        Log:        null,          // ← add this line
        IsFinished: false,         // ← and this one
      };

      const res = await fetch('/api/missionFunctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      alert('Mission created ✔️');
      router.refresh();
      closeAll();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  /* render --------------------------------------------------------- */
  return (
    <Dialog open={isOpen} onClose={() => {}} className="dialog">
      <Dialog.Panel
        className="dialog-panel"
        onKeyDownCapture={(e) => {
          if (e.key === 'Escape') e.stopPropagation();
        }}
      >
        <button className="close-btn" onClick={handleClose}>✕</button>
        <h2 className="title">Create Mission</h2>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* —— Step 0: Name —— */}
          {step === 0 && (
            <div className="field">
              <label>Mission Name</label>
              <input
                {...register('missionName', { required: true })}
                className="input"
              />
              {errors.missionName && <span className="error">Required</span>}
            </div>
          )}

          {/* —— Step 1: StartTime —— */}
          {step === 1 && (
            <div className="field">
              <label>Start Time</label>
              <input
                type="datetime-local"
                {...register('StartTime', { required: true })}
                className="input"
              />
            </div>
          )}

          {/* —— Step 2: Duration —— */}
          {step === 2 && (
            <div className="field">
              <label>Duration (HH:MM)</label>
              <input
                type="time"
                step="60"
                {...register('Duration', { required: true })}
                className="input"
              />
            </div>
          )}

          {/* —— Step 3: Map —— */}
          {step === 3 && (
            <MapPicker
              value={watch('location')}
              onChange={(loc) => setValue('location', loc)}
            />
          )}

          {/* —— Step 4: Soldiers —— */}
          {step === 4 && (
            <div className="field">
              <label>Pick Soldiers</label>
              <PersonPicker
                role="Soldier"
                values={watch('soldiers')}
                setValues={(v) => setValue('soldiers', v)}
                selected={selSoldiers}
                setSelected={setSelSoldiers}
              />
            </div>
          )}

          {/* —— Step 5: Commanders —— */}
          {step === 5 && (
            <div className="field">
              <label>Pick Commanders</label>
              <PersonPicker
                role="Commander"
                values={watch('commanders')}
                setValues={(v) => setValue('commanders', v)}
                selected={selCommanders}
                setSelected={setSelCommanders}
              />
            </div>
          )}

          {/* —— Step 6: Configuration —— */}
          {step === 6 && (
            <div className="field">
              <label>Pick Configuration</label>
              <ConfigPicker
                value={watch('Configuration')}
                onChange={(id) => setValue('Configuration', id)}
              />
            </div>
          )}

          {step === 7 && (
            <div className="field">
              <label>Pick Configuration</label>
              
            </div>
          )}

          {/* —— navigation buttons —— */}
          <button
            type="button"
            className="nav nav-left"
            onClick={prev}
            disabled={step === 0}
          >
            ◀
          </button>

          {step < steps.length -1  ? (
            <button
              type="button"
              className="nav nav-right"
              onClick={next}
              disabled={!stepFilled}
            >
              ▶
            </button>
          ) : (
            <button type="submit" className="nav nav-right">
              ✔
            </button>
          )}
        </form>
      </Dialog.Panel>
    </Dialog>
  );
}
