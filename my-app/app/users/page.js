'use client';
import CreateMissionButton from '../components/CreateMissionButton';

export default function CreateMissionPage() {
  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Missions</h1>

      {/* trigger opens the multi-step “Create Mission” wizard */}
      <CreateMissionButton />
    </main>
  );
}
