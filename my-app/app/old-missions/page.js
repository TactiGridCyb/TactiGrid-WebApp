import Navbar from '../components/Navbar.js';
import styles from '../styles/OldMissions.module.css';


export default function ViewOldMissions() {
  // Example static data – replace with your actual old missions
  const missions = [
    'Name, MissionID, StartTime, EndTime, Duration, LogFiles, GMK, SoldiersList, Location, ConfigID, ViewVideo',
    'Name, MissionID, StartTime, EndTime, Duration, LogFiles, GMK, SoldiersList, Location, ConfigID, ViewVideo',
    'Name, MissionID, StartTime, EndTime, Duration, LogFiles, GMK, SoldiersList, Location, ConfigID, ViewVideo',
    'Name, MissionID, StartTime, EndTime, Duration, LogFiles, GMK, SoldiersList, Location, ConfigID, ViewVideo',
    'Name, MissionID, StartTime, EndTime, Duration, LogFiles, GMK, SoldiersList, Location, ConfigID, ViewVideo',
  ];

  return (
    <div>

      <Navbar />

    
      <header className={styles.header}>
        <h1>View Old Missions</h1>
      </header>

      
      <main className={styles.main}>
        
        <div className={styles.missionsContainer}>
          {missions.map((mission, index) => (
            <div key={index} className={styles.missionBox}>
              {mission}
            </div>
          ))}
        </div>

        
        <button className={styles.createReportBtn}>
          Create Report
        </button>
      </main>
    </div>
  );
}
