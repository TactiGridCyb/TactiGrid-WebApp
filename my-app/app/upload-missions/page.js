"use client";
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import styles from "../styles/pagesDesign/uploadMissions.module.css";

export default function UploadMission() {
  const [socketOutput, setSocketOutput] = useState("");
  const [lastReceivedMessage, setLastReceivedMessage] = useState("");

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
          <h2>Output From the watch: {socketOutput}</h2>
        </div>
      </main>
    </div>
  );
}
