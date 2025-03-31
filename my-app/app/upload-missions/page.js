// pages/index.js
import Navbar from '../components/Navbar';
import styles from '../styles/uploadMissions.module.css';

export default function UploadMission() {
  // Example function to handle the upload process
  const handleUpload = () => {
    alert('Transferring data from wearables to server...');
    // You can add real upload logic here, e.g.:
    // - sending a request to the server
    // - reading data from a file input, etc.
  };

  return (
    <div>
      {/* Navbar at the top */}
      <Navbar />

      {/* Header */}
      <header className={styles.header}>
        <h1>Upload Mission</h1>
      </header>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.uploadContainer}>
          <button 
            className={styles.uploadBtn}
            
          >
            Upload
          </button>
          <button 
            className={styles.uploadBtn}
            
          >
            Open Socket
          </button>
          <h2>Output From the watch: </h2>
        </div>
      </main>
    </div>
  );
}

  