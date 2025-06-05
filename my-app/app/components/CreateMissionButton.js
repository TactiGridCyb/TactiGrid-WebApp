'use client';
import { useState } from 'react';
import CreateMissionDialog from '../components/CreateMissionDialog';

export default function CreateMissionButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
      >
        + Create Mission
      </button>

      <CreateMissionDialog
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
