import { cookies } from 'next/headers';
import Navbar      from '/app/components/Navbar';
import ProvisionFlow from '/app/components/ProvisionFlow';   // ⬅ client component
import styles      from '/app/styles/pagesDesign/ProvisionPage.module.css';

async function getMission(id) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res  = await fetch(`${base}/api/missionFunctions/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return await res.json();
}

export default async function ProvisionPage({ params }) {
    const ParamStore = await params;
  const doc = await getMission(ParamStore.id);
  if (!doc) return <p>Mission not found.</p>;

  /* normalise */
  const soldiers   = doc.Soldiers   ?? doc.soldiers   ?? [];
  const commanders = doc.Commanders ?? doc.commanders ?? [];

  return (
    <div>
      <Navbar />
      <header className={styles.header}>
        <h1>Provision&nbsp;Flow — {doc.missionName || doc.name}</h1>
      </header>

      {/* client-side component handles real-time flow */}
      <ProvisionFlow
        missionId={ParamStore.id}
        soldiers={soldiers}
        commanders={commanders}
      />
    </div>
  );
}
