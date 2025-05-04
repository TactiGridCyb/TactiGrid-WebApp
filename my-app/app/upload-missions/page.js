"use client";
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import styles from "../styles/pagesDesign/uploadMissions.module.css";

export default function UploadMission() {
  const [socketOutput, setSocketOutput] = useState("");
  const [lastReceivedMessage, setLastReceivedMessage] = useState("");
  const [shares, setShares] = useState(null);
  const [recoveredSecret, setRecoveredSecret] = useState('');

  // Simulate an upload action
  const handleUpload = () => {
    alert("Transferring data from wearables to server...");
    // Add your actual upload logic here.
  };

  // Trigger the API endpoint to start the UDP listener
  const startUDPServer = async () => {
    try {
      // In Next 13 App Router, the route is at /api/udp-listener
      const response = await fetch("/api/udp-listener", {
        method: "POST",
      });
      const data = await response.json();
      alert(data.status || "Server started");
    } catch (err) {
      console.error("Error starting UDP server:", err);
      alert("Failed to start UDP server");
    }
  };

  const handleShamir = async () => {
    try {
      // 1) Define a demo secret and encode to base64
      const demoSecret = 'TOPSECRET';
      const secretBase64 = btoa(demoSecret);

      // 2) Split into shares (n=5, k=3)
      const splitRes = await fetch('/api/shamir/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretBase64, n: 5, k: 3 })
      });
      const { shares } = await splitRes.json();
      setShares(shares);

      // 3) Reconstruct using the first 3 shares
      const recRes = await fetch('/api/shamir/reconstruct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shares: shares.slice(0, 3) })
      });
      const { secretBase64: recBase64 } = await recRes.json();
      setRecoveredSecret(atob(recBase64));
    } catch (err) {
      console.error('Shamir error:', err);
      alert('Failed to run Shamir algorithm');
    }
  };

  // Periodically check for new UDP messages
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/udp-listener", {
          method: "GET",
        });
        if (!response.ok) return; // ignore if error

        const data = await response.json();
        if (data.message && data.message !== lastReceivedMessage) {
          alert(`Received new UDP message: ${data.message}`);
          setLastReceivedMessage(data.message);
          setSocketOutput(data.message);
        }
      } catch (err) {
        console.error("Error fetching UDP message:", err);
      }
    }, 3000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [lastReceivedMessage]);

  return (
    <div>
      <Navbar />

      <header className={styles.header}>
        <h1>Upload Mission</h1>
      </header>

      <main className={styles.main}>
        <div className={styles.uploadContainer}>
          <button className={styles.uploadBtn} onClick={handleUpload}>
            Upload
          </button>
          <button className={styles.uploadBtn} onClick={startUDPServer}>
            Open Socket
          </button>
          <button className={styles.uploadBtn} onClick={handleShamir}>
            Upload Shamir
          </button>
        </div>

        <section className={styles.uploadContainer}>
          <h2>Output From the Watch:</h2>
          <p>{socketOutput}</p>
        </section>

        {shares && (
          <section className={styles.uploadContainer}>
            <h2>Generated Shamir Shares (need any 3 of 5):</h2>
            <table className={styles.shareTable}>
              <thead>
                <tr>
                  <th>Share #</th>
                  <th>Points (x,y)</th>
                </tr>
              </thead>
              <tbody>
                {shares.map((share, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{share.map(([x, y]) => `(${x},${y})`).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {recoveredSecret && (
          <section className={styles.uploadContainer}>
            <h2>Reconstructed Secret:</h2>
            <pre className={styles.recovered}>{recoveredSecret}</pre>
          </section>
        )}
      </main>
    </div>
  );
}
