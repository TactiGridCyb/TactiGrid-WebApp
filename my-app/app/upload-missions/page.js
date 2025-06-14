"use client";

import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import styles from "../styles/pagesDesign/uploadMissions.module.css";

export default function UploadMission() {
  const [socketOutput, setSocketOutput] = useState("");
  const [lastReceivedMessage, setLastReceivedMessage] = useState("");
  const [shares, setShares] = useState(null);
  const [recoveredSecret, setRecoveredSecret] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedShares, setUploadedShares] = useState([]);
  const [reconstructedFile, setReconstructedFile] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [showCommanderModal, setShowCommanderModal] = useState(false);
  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const openModal = async () => {
    try {
      const res = await fetch("/api/missions");
      const data = await res.json();
      

      setMissions(data.missions || []);
      setShowModal(true);
    } catch (err) {
      console.error("Failed to fetch missions", err);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedMission(null);
  };

  const startUDPServer = async () => {
    try {
      const response = await fetch("/api/udp-listener", { method: "POST" });
      const data = await response.json();
      alert(data.status || "Server started");
    } catch (err) {
      console.error(err);
      alert("Failed to start UDP server");
    }
  };

  const handleShamir = async () => {
    try {
      const demoSecret = "TOPSECRET";
      const secretBase64 = btoa(demoSecret);

      const splitRes = await fetch("/api/shamir/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretBase64, n: 5, k: 3 }),
      });
      const { shares } = await splitRes.json();
      setShares(shares);

      const recRes = await fetch("/api/shamir/reconstruct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shares: shares.slice(0, 3) }),
      });
      const { secretBase64: recBase64 } = await recRes.json();
      setRecoveredSecret(atob(recBase64));
    } catch (err) {
      console.error(err);
      alert("Failed to run Shamir algorithm");
    }
  };

  const handleFileSelect = (e) => setSelectedFile(e.target.files[0]);

  const handleFileSplit = async () => {
    if (!selectedFile) return alert("Please select a file first");
    try {
      const buffer = await selectedFile.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const res = await fetch("/api/shamir/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secretBase64: base64,
          n: 5,
          k: 3,
          fileName: selectedFile.name,
        }),
      });
      const { shares } = await res.json();
      setShares(shares);

      for (let i = 0; i < shares.length; i++) {
        const blob = new Blob([JSON.stringify(shares[i])], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `share_${i + 1}_${selectedFile.name}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      alert("All shares downloaded");
    } catch (err) {
      console.error(err);
      alert("Split failed: " + err.message);
    }
  };

  const handleShareUpload = (e) =>
    setUploadedShares(Array.from(e.target.files));

  const handleFileReconstruct = async () => {
    if (uploadedShares.length < 3)
      return alert("Please upload at least 3 shares");
    try {
      const sharesData = [];
      for (let file of uploadedShares) {
        const txt = await file.text();
        sharesData.push(JSON.parse(txt));
      }
      const res = await fetch("/api/shamir/reconstruct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shares: sharesData }),
      });
      const { secretBase64 } = await res.json();
      const bin = atob(secretBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      const blob = new Blob([bytes]);
      setReconstructedFile({
        blob,
        name: uploadedShares[0].name
          .replace(/^share_\d+_/, "")
          .replace(/.json$/, ""),
      });
    } catch (err) {
      console.error(err);
      alert("Reconstruction failed");
    }
  };

  const downloadReconstructedFile = () => {
    if (!reconstructedFile) return;
    const url = URL.createObjectURL(reconstructedFile.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = reconstructedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRecover = async () => {
    try {
      const res = await fetch("/api/shamir/recover", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      alert("✅ Recovery complete! File saved and content:\n\n" + json.secretText);
    } catch (err) {
      console.error(err);
      alert("❌ Recovery failed: " + err.message);
    }
  };

  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const r = await fetch("/api/udp-listener");
        const { message } = await r.json();
        if (message && message !== lastReceivedMessage) {
          setLastReceivedMessage(message);
          setSocketOutput(message);
          alert("Received new UDP message: " + message);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(iv);
  }, [lastReceivedMessage]);

  return (
    <div>
      <Navbar />
      <header className={styles.header}>
        <h1>Upload Mission</h1>
      </header>
      <main className={styles.main}>
        <div className={styles.uploadContainer}>
          <button className={styles.uploadBtn} onClick={openModal}>
            Upload Mission
          </button>
          <button className={styles.uploadBtn} onClick={startUDPServer}>
            Open Socket
          </button>
          <button className={styles.uploadBtn} onClick={handleShamir}>
            Test Shamir String
          </button>
          <button className={styles.uploadBtn} onClick={handleRecover}>
            Recover Mission File
          </button>
        </div>

        {showModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalWindow}>
              <h2>Select a Mission to Upload</h2>

              <div className={styles.dropdown}>
                <button
                  className={styles.dropdownToggle}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  {selectedMission ? selectedMission.name : "Select a Mission"}
                </button>

                {dropdownOpen && (
                  <ul className={styles.dropdownList}>
                    {missions.map((mission) => (
                      <li
                        key={mission.id}
                        className={styles.dropdownItem}
                        onClick={() => {
                          setSelectedMission(mission);
                          setDropdownOpen(false);
                        }}
                      >
                        {mission.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selectedMission && (
                <button
                  className={styles.uploadBtn}
                  onClick={() => {
                    setShowModal(false);
                    setShowCommanderModal(true);
                  }}
                >
                  Upload
                </button>
              )}

              <div className={styles.modalActions}>
                <button className={styles.uploadBtn} onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showCommanderModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalWindow}>
              <h2>Commander Upload</h2>
              <p>Start the UDP connection to receive the certificate, GMK, and log.</p>
              <button
                className={styles.uploadBtn}
                onClick={async () => {
                  const res = await fetch("/api/commander-upload", { method: "POST" });
                  const { status } = await res.json();
                  alert("UDP listener started: " + status);
                }}
              >
                Commander Upload
              </button>
              <button className={styles.uploadBtn} onClick={() => setShowCommanderModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Leave the rest of your logic unchanged below */}
        {/* ... file splitting, reconstruction, UDP messages ... */}
      </main>
    </div>
  );
}
