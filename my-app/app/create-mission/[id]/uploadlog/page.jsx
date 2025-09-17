import Navbar from '/app/components/Navbar';
import LogUploadFlow from '/app/components/LogUploadFlow';
import styles from '/app/styles/pagesDesign/ProvisionPage.module.css';

async function getMission(id) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res  = await fetch(`${base}/api/missionFunctions/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function LogsPage({ params }) {
  const { id } = await params;
  const doc = await getMission(id);
  if (!doc) return <p>Mission not found.</p>;

  return (
    <div className={styles.shell}>
      <div className={styles.bg} />
      <Navbar />

      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.title}>
            Upload Logs — <span className={styles.missionName}>{doc.missionName || doc.name}</span>
          </h1>
          <p className={styles.sub}>Start the upload server, then POST the encrypted log to the endpoint below.</p>

          <div className={styles.metrics}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Mission ID</span>
              <span className={styles.metricValue}>{id}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Location</span>
              <span className={styles.metricValue}>{doc.Location?.name ?? '—'}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Start</span>
              <span className={styles.metricValue}>{new Date(doc.StartTime ?? Date.now()).toLocaleString()}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Finished</span>
              <span className={styles.metricValue}>{String(doc.IsFinished)}</span>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.mainGrid}>
        <section className={styles.panel}>
          <LogUploadFlow missionId={id} />
        </section>
      </main>
    </div>
  );
}
