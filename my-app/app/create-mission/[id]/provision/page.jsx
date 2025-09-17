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

  return (
    <div className={styles.shell}>
      <div className={styles.bg} />
      <Navbar />

      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.title}>
            Provision&nbsp;<span className={styles.missionName}>{doc.missionName || doc.name}</span>
          </h1>
          <p className={styles.sub}>
            Secure TLS provisioning for commanders & soldiers
          </p>

          <div className={styles.metrics}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Commanders</span>
              <span className={styles.metricValue}>{commanders.length}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Soldiers</span>
              <span className={styles.metricValue}>{soldiers.length}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Location</span>
              <span className={styles.metricValue}>{doc.Location?.name ?? '—'}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Start</span>
              <span className={styles.metricValue}>
                {new Date(doc.StartTime ?? Date.now()).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.mainGrid}>
        <section className={styles.panel}>
          <ProvisionFlow missionId={id} soldiers={soldiers} commanders={commanders} />
        </section>
      </main>
    </div>
  );
}
