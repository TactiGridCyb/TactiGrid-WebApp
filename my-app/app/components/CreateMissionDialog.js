'use client';

import '../styles/componentsDesign/CreateMissionDialog.css';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@headlessui/react';
import { useForm , useWatch } from 'react-hook-form';
import 'leaflet/dist/leaflet.css';

import MapPicker from '../components/MapPicker';
import PersonPicker from '../components/PersonPicker';

const steps = [
  'ID','Name','StartTime','Duration',
  'GeneralLocation','Soldiers','Commanders','configurationId'
];


const requiredPerStep = [
  ['id'],                                // step 0
  ['name'],                              // step 1
  ['startTime'],                         // step 2
  ['duration'],                          // step 3
  ['location.lat', 'location.lng'],      // step 4
  ['soldiers'],                          // step 5  (at least one)
  ['commanders'],                        // step 6  (at least one)
  ['configurationId'],                                    // step 7  (config optional)
];



export default function CreateMissionDialog({ isOpen, onClose }) {
  /* form */
  const {
    register, handleSubmit, watch, setValue, reset, control, trigger, 
    formState:{ errors }
  } = useForm({
    defaultValues:{
      id:'', name:'', startTime:'', duration:'01:00',
      location:{ lat:31.7717,lng:35.217,address:'' },
      soldiers:[], commanders:[], configurationId:''
    }
  });

  /* wizard nav */
  const [step,setStep] = useState(0);
  const next = async () => {
  // validate only the fields for the *current* step
  const valid = await trigger(requiredPerStep[step]);
  if (!valid) return;                   // stay on page if invalid
  setStep((s) => Math.min(s + 1, steps.length - 1));
};


function useStepFilled(stepIndex) {
  const names  = requiredPerStep[stepIndex];     // e.g. ['id'] or ['soldiers']
  const values = useWatch({ control, name: names });

  // when names.length === 1, `values` is the scalar itself
  if (!Array.isArray(names) || names.length === 0) return true;

  return names.every((field, i) => {
    const val = Array.isArray(values) ? values[i] : values;  // align indexes
    if (Array.isArray(val))          return val.length > 0;   // soldiers / commanders
    if (typeof val === 'object')     return Object.values(val).every(Boolean); // location.{lat,lng}
    return Boolean(val);                                       // plain string/number
  });
}
const stepFilled = useStepFilled(step);




  const prev = ()=>setStep(s=>Math.max(s-1,0));

  /* selected object panes */
  const [selSoldiers, setSelSoldiers]     = useState([]);
  const [selCommanders, setSelCommanders] = useState([]);

 const router = useRouter();

  const closeAll = () => {
    reset(); setSelSoldiers([]); setSelCommanders([]); setStep(0); onClose();
  };
  const handleClose = () =>
    confirm('Discard all entered data?') && closeAll();

  const onSubmit = async (data) => {
  try {
    if (data.soldiers.length === 0) {
    alert('Pick at least one soldier');
    return;
    }
    if (data.commanders.length === 0) {
    alert('Pick at least one commander');
    return;
    }
    const res = await fetch('/api/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());

   alert('Mission created ✔');

    /* force-refresh: either hard reload or router.refresh() */
    // window.location.reload();        // ← full hard reload
    router.refresh();                   // ← Next.js (app router) smart refresh

  } catch (err) {
    alert('Error: ' + err.message);
 } finally {
    reset();
    setSelSoldiers([]);      // clear local lists if you kept the hook refactor
    setSelCommanders([]);
    setStep(0);
    onClose();
  }
};

  /* render */
  return (
    <Dialog open={isOpen} onClose={()=>{}} className="dialog">
      <Dialog.Panel className="dialog-panel" onKeyDownCapture={(e) => {if (e.key === 'Escape') {e.stopPropagation();}}}>
        <button className="close-btn" onClick={handleClose}>✕</button>
        <h2 className="title">Create Mission</h2>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* ===== Step 0-4: Basic info + map ===== */}
          {step===0&&(
            <div className="field">
              <label>ID</label>
              <input {...register('id',{required:true})} className="input"/>
              {errors.id && <span className="error">Required</span>}
            </div>)}

          {step===1&&(
            <div className="field">
              <label>Name</label>
              <input {...register('name',{required:true})} className="input"/>
              {errors.name && <span className="error">Required</span>}
            </div>)}

          {step===2&&(
            <div className="field">
              <label>Start Time</label>
              <input type="datetime-local" {...register('startTime',{required:true})} className="input"/>
            </div>)}

          {step===3&&(
            <div className="field">
              <label>Duration (HH:MM)</label>
              <input type="time" step="60" {...register('duration',{required:true})} className="input"/>
            </div>)}

          {step === 4 && (
  <MapPicker
    value={watch('location')}
    onChange={(loc) => setValue('location', loc)}
  />
)}

          {/* ===== Soldiers ===== */}
          {step===5&&(
            <div className="field">
              <label>Pick Soldiers</label>
              <PersonPicker
                role="Soldier"
                values={watch('soldiers')}
                setValues={v=>setValue('soldiers',v)}
                selected={selSoldiers}
                setSelected={setSelSoldiers}
              />
            </div>)}

          {/* ===== Commanders ===== */}
          {step===6&&(
            <div className="field">
              <label>Pick Commanders</label>
              <PersonPicker
                role="Commander"
                values={watch('commanders')}
                setValues={v=>setValue('commanders',v)}
                selected={selCommanders}
                setSelected={setSelCommanders}
              />
            </div>)}

          {step===7&&(
            <div className="field">
              <label>Configuration ID</label>
              <input
      {...register('configurationId', { required: true })}
     className="input"
    />
    {errors.configurationId && (
     <span className="error">Required</span>
    )}
  </div>
          )}

          {/* ===== nav ===== */}
          <button type="button" className="nav nav-left" onClick={prev} disabled={step === 0}>◀</button>
          {step < steps.length - 1
            ? <button
              type="button"
              className="nav nav-right"
              onClick={next}
              disabled={!stepFilled}
            >
              ▶
            </button>
            : <button type="submit"  className="nav nav-right">✔</button>}
        </form>
      </Dialog.Panel>
    </Dialog>
  );
}
