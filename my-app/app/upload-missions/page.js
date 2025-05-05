"use client";
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import styles from "../styles/pagesDesign/uploadMissions.module.css";

export default function UploadMission() {
  const [socketOutput, setSocketOutput] = useState("");
  const [lastReceivedMessage, setLastReceivedMessage] = useState("");
  const [shares, setShares] = useState(null);
  const [recoveredSecret, setRecoveredSecret] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedShares, setUploadedShares] = useState([]);
  const [reconstructedFile, setReconstructedFile] = useState(null);

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

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleShareUpload = (event) => {
    const files = Array.from(event.target.files);
    setUploadedShares(files);
  };

  const handleFileSplit = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await selectedFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64
      const base64String = Buffer.from(uint8Array).toString('base64');

      // Split into shares
      const splitRes = await fetch('/api/shamir/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          secretBase64: base64String, 
          n: 5, 
          k: 3,
          fileName: selectedFile.name 
        })
      });
      const { shares } = await splitRes.json();
      
      // Debug log
      console.log('Received shares:', shares);
      
      if (!Array.isArray(shares) || shares.length !== 5) {
        throw new Error(`Expected 5 shares, got ${shares.length}`);
      }

      setShares(shares);

      // Create downloadable share files one by one
      for (let index = 0; index < shares.length; index++) {
        const share = shares[index];
        const shareBlob = new Blob([JSON.stringify(share)], { type: 'application/json' });
        const shareUrl = URL.createObjectURL(shareBlob);
        const link = document.createElement('a');
        link.href = shareUrl;
        link.download = `share_${index + 1}_${selectedFile.name}.json`;
        
        // Wait for the current download to complete before starting the next one
        await new Promise((resolve) => {
          link.onclick = () => {
            setTimeout(() => {
              URL.revokeObjectURL(shareUrl);
              resolve();
            }, 500); // Increased delay to ensure download starts
          };
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
      }

      alert('All shares have been downloaded successfully!');
    } catch (err) {
      console.error('File split error:', err);
      alert(`Failed to split file: ${err.message}`);
    }
  };

  const handleFileReconstruct = async () => {
    if (uploadedShares.length < 3) {
      alert('Please upload at least 3 shares');
      return;
    }

    try {
      const sharesData = [];
      for (const file of uploadedShares) {
        const text = await file.text();
        const share = JSON.parse(text);
        sharesData.push(share);
      }

      const recRes = await fetch('/api/shamir/reconstruct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shares: sharesData })
      });
      const { secretBase64 } = await recRes.json();
      
      // Convert base64 back to file
      const binaryString = atob(secretBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const reconstructedBlob = new Blob([bytes]);
      setReconstructedFile({
        blob: reconstructedBlob,
        name: uploadedShares[0].name
          .replace(/^share_\d+_/, '')
          .replace(/\.json$/, '')
      });
    } catch (err) {
      console.error('File reconstruction error:', err);
      alert('Failed to reconstruct file');
    }
  };

  const downloadReconstructedFile = () => {
    if (!reconstructedFile) return;
    
    const url = URL.createObjectURL(reconstructedFile.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = reconstructedFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
            Test Shamir String
          </button>
        </div>

        <section className={styles.uploadContainer}>
          <h2>File Split and Reconstruct</h2>
          <div className={styles.fileSection}>
            <h3>Split File</h3>
            <input 
              type="file" 
              onChange={handleFileSelect} 
              className={styles.fileInput}
            />
            <button 
              className={styles.uploadBtn} 
              onClick={handleFileSplit}
              disabled={!selectedFile}
            >
              Split File
            </button>
          </div>

          <div className={styles.fileSection}>
            <h3>Reconstruct File</h3>
            <input 
              type="file" 
              multiple 
              onChange={handleShareUpload}
              className={styles.fileInput}
            />
            <button 
              className={styles.uploadBtn} 
              onClick={handleFileReconstruct}
              disabled={uploadedShares.length < 3}
            >
              Reconstruct File
            </button>
          </div>

          {reconstructedFile && (
            <div className={styles.fileSection}>
              <h3>Reconstructed File Ready</h3>
              <button 
                className={styles.uploadBtn} 
                onClick={downloadReconstructedFile}
              >
                Download {reconstructedFile.name}
              </button>
            </div>
          )}
        </section>

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
