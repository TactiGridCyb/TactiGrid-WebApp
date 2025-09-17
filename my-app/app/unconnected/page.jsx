// app/unconnected/page.jsx
import Navbar from "../components/Navbar";
import styles from "../styles/pagesDesign/Unconnected.module.css";
export default function UnconnectedPage({ searchParams }) {
  const next = searchParams?.next || "/";

  return (
    <>
      <Navbar />

      <main className={styles.wrap}>
        <div className={styles.centerStage}>
          <div className={styles.redBubble} role="status" aria-live="polite">
            <div className={styles.pip} aria-hidden="true" />
            <div className={styles.bubbleText}>
              <strong>Not connected</strong>
              <span>Log in to access this page</span>
            </div>
          </div>

          <section className={styles.card}>
            <h1 className={styles.title}>You’re not connected</h1>
            <p className={styles.lead}>
              This page is protected. Please use the <b>Log In</b> button in the
              navbar. After logging in, you’ll be routed back to:
            </p>
            <code className={styles.code}>{next}</code>

            <div className={styles.tips}>
              <p>What to do next:</p>
              <ul>
                <li>Click <b>Log In</b> (top-right).</li>
                <li>Complete authentication.</li>
                <li>You’ll return to <code>{next}</code> automatically.</li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}