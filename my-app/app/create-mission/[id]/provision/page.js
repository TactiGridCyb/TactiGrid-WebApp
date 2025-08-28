// app/provision/[id]/page.jsx
import Navbar from '/app/components/Navbar';
import ProvisionFlow from '/app/components/ProvisionFlow';
import styles from '/app/styles/pagesDesign/ProvisionPage.module.css';

async function getMission(id) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res  = await fetch(`${base}/api/missionFunctions/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function ProvisionPage({ params }) {
  const { id } = await params;
  const doc = await getMission(id);
  if (!doc) return <p>Mission not found.</p>;

  const soldiers   = doc.Soldiers   ?? doc.soldiers   ?? [];
  const commanders = doc.Commanders ?? doc.commanders ?? [];

  const defaultHost = process.env.PROVISION_HOST || '0.0.0.0';
  const defaultPort = Number(process.env.PROVISION_PORT || 8743);

  return (
    <div className={styles.page}>
      <Navbar />
      <header className={styles.header}>
        <h1>Provision — {doc.missionName || doc.name}</h1>
        <p className={styles.sub}>Secure TLS provisioning for commanders & soldiers</p>
      </header>

      <section className={styles.grid}>
        <aside className={styles.card}>
          <h2 className={styles.cardTitle}>Mission details</h2>
          <dl className={styles.kv}>
            <div><dt>ID</dt><dd>{id}</dd></div>
            <div><dt>Start</dt><dd>{new Date(doc.StartTime ?? doc.startTime ?? Date.now()).toLocaleString()}</dd></div>
            <div><dt>Duration</dt><dd>{(doc.Duration ?? doc.duration) ?? '—'} sec</dd></div>
            <div><dt>Location</dt><dd>{doc.Location?.name ?? doc.location?.name ?? '—'}</dd></div>
            <div><dt>Commanders</dt><dd>{commanders.length}</dd></div>
            <div><dt>Soldiers</dt><dd>{soldiers.length}</dd></div>
          </dl>
          <p className={styles.hint}>
            If you see <code>EADDRINUSE</code>, another process is using the port. Try <b>Force takeover</b> or change the port.
          </p>
        </aside>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Provision controller</h2>
          <ProvisionFlow
            missionId={id}
            soldiers={soldiers}
            commanders={commanders}
            defaultHost={defaultHost}
            defaultPort={defaultPort}
            defaultForce={true}
          />
        </section>
      </section>
    </div>
  );
}
