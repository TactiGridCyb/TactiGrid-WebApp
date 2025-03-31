"use client";

import Navbar from '../components/Navbar.js';
import styles from '../styles/CreateConfiguration.module.css';

export default function CreateConfiguration() {
  // Example function to handle configuration creation
  const handleCreate = () => {
    alert('Configuration Created Successfully!');
    // You could also redirect or update state here
  };

  return (
    <div>
      {/* Navbar at the top */}
      <Navbar />

      {/* Header */}
      <header className={styles.header}>
        <h1>Create Configuration</h1>
      </header>

      {/* Main content */}
      
      <main className={styles.main}>
      <div className={styles.card}>
        <div className={styles.formContainer}>
          {/* General Location */}
          <div className={styles.formGroup}>
            <label>Enter General Location</label>
            <input 
              type="text" 
              placeholder="Enter location..." 
            />
          </div>

          {/* Parameters */}
          <div className={styles.formGroup}>
            <label>Select Parameters</label>
            <select>
              <option value="">Choose a parameter...</option>
              <option value="param1">Parameter #1</option>
              <option value="param2">Parameter #2</option>
              {/* Add more options as needed */}
            </select>
          </div>

          {/* Post Mission Logs */}
          <div className={styles.formGroup}>
            <label>Select Post Mission Logs</label>
            <select>
              <option value="">Choose logs...</option>
              <option value="logs1">Logs #1</option>
              <option value="logs2">Logs #2</option>
              {/* Add more options as needed */}
            </select>
          </div>

          {/* Create Button */}
          <button 
            className={styles.createBtn}
            onClick={handleCreate}
          >
            Create
          </button>
        </div>
        </div>
      </main>
    </div>
  );
}
