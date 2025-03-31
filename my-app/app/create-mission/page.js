import Navbar from '../components/Navbar.js';
import styles from '../styles/createMission.module.css';

export default function CreateNewMission() {
  const handleCreateMission = () => {
    // TODO: implement the creation logic
    alert('Mission created successfully!');
    // e.g. show popup or redirect to another page
  };

  return (
    <div>
      {/* Nav Bar */}
      <Navbar />

      {/* Header Section */}
      <header className={styles.header}>
        <h1>Create New Mission</h1>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.formContainer}>
          <div className={styles.formGroup}>
            <label>Mission ID</label>
            <input 
              type="text" 
              placeholder="GENERATED MISSIONID..." 
              disabled
            />
          </div>

          <div className={styles.formGroup}>
            <label>Enter Mission Name</label>
            <input type="text" placeholder="Enter mission name..." />
          </div>

          <div className={styles.formGroup}>
            <label>Enter ConfigurationID</label>
            <select>
              <option value="">Select configuration...</option>
              <option value="config1">Configuration #1</option>
              <option value="config2">Configuration #2</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Enter Commander</label>
            <select>
              <option value="">Select commander...</option>
              <option value="commander1">Commander #1</option>
              <option value="commander2">Commander #2</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Enter Soldiers</label>
            <select>
              <option value="">Select soldiers...</option>
              <option value="soldier1">Soldier #1</option>
              <option value="soldier2">Soldier #2</option>
            </select>
          </div>

          <button 
            className={styles.createMissionBtn} 
            
          >
            Create Mission
          </button>
        </div>
      </main>
    </div>
  );
}
