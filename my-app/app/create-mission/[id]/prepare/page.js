// Server Component
import { cookies }     from 'next/headers';       // ← import added
import Navbar          from '/app/components/Navbar';
import styles          from '/app/styles/pagesDesign/PreparePage.module.css';

/* helper: map the DB doc → canonical shape */
const canon = (m) => ({
  soldiers:   m.Soldiers   ?? m.soldiers   ?? [],
  commanders: m.Commanders ?? m.commanders ?? [],
  name:       m.missionName ?? m.missionsName ?? m.name ?? 'Mission',
});

async function getMission(id, cookieHeader) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res  = await fetch(`${base}/api/missionFunctions/${id}`, {
    headers: { cookie: cookieHeader },
    cache:   'no-store',
  });
  if (!res.ok) return null;
  return canon(await res.json());
}

export default async function PreparePage({ params }) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const { id } = await params;
  console.log(params);
  const mission = await getMission(id, cookieHeader);

  if (!mission)
    return <p style={{ textAlign: 'center', marginTop: '4rem' }}>
             Mission not found
           </p>;

  const { soldiers, commanders, name } = mission;

  return (
    <div>
      <Navbar />

      <header className={styles.header}>
        <h1>Provision&nbsp;—&nbsp;{name}</h1>
      </header>

      <main className={styles.main}>
        <section className={styles.column}>
          <h2>Soldiers&nbsp;({soldiers.length})</h2>
          <ul>
            {soldiers.map((sid) => (
              <li key={sid.toString()}>{sid.toString()}</li>
            ))}
          </ul>
        </section>

        <section className={styles.column}>
          <h2>Commanders&nbsp;({commanders.length})</h2>
          <ul>
            {commanders.map((cid) => (
              <li key={cid.toString()}>{cid.toString()}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
