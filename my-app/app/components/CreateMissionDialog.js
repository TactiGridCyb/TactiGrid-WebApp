'use client';

import '../styles/componentsDesign/CreateMissionDialog.css';
import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import 'leaflet/dist/leaflet.css';

import MapPicker from '../components/MapPicker';
import PersonPicker from '../components/PersonPicker';

const steps = [
  'ID','Name','StartTime','Duration',
  'GeneralLocation','Soldiers','Commanders','ConfigID'
];

export default function CreateMissionDialog({ isOpen, onClose }) {
  /* form */
  const {
    register, handleSubmit, watch, setValue, reset,
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
  const next = ()=>setStep(s=>Math.min(s+1,steps.length-1));
  const prev = ()=>setStep(s=>Math.max(s-1,0));

  /* selected object panes */
  const [selSoldiers, setSelSoldiers]     = useState([]);
  const [selCommanders, setSelCommanders] = useState([]);

 

  const closeAll = () => {
    reset(); setSelSoldiers([]); setSelCommanders([]); setStep(0); onClose();
  };
  const handleClose = () =>
    confirm('Discard all entered data?') && closeAll();

  const onSubmit = data => {
    console.log(data);
    alert(JSON.stringify(data,null,2));
    closeAll();
  };

  /* render */
  return (
    <Dialog open={isOpen} onClose={handleClose} className="dialog">
      <Dialog.Panel className="dialog-panel">
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
              <input {...register('configurationId')} className="input"/>
            </div>)}

          {/* ===== nav ===== */}
          <button type="button" className="nav nav-left" onClick={prev} disabled={step===0}>◀</button>
          {step<steps.length-1
            ? <button type="button" className="nav nav-right" onClick={next}>▶</button>
            : <button type="submit"  className="nav nav-right">✔</button>}
        </form>
      </Dialog.Panel>
    </Dialog>
  );
}
