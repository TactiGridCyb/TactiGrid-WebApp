import Navbar from '../components/Navbar.js';
import styles from '../styles/pagesDesign/OldMissions.module.css';
import MissionItem from '../components/missionItem.js';


export default function ViewOldMissions() {
  // Example static mission objects – replace with your actual old missions data.
  const missions = [
    {
      name: 'Operation Redhawk',
      missionID: 'ABC123',
      startTime: '08:00',
      endTime: '10:30',
      duration: '2h30m',
      logFiles: 'logs_2025_03_30.txt',
      gmk: 'mission_map.gmk',
      soldiersList: 'John, Sarah, Alex',
      location: 'Base Delta',
      configID: 'config_v2',
    },
    {
      name: 'Operation Nightfall',
      missionID: 'DEF456',
      startTime: '11:00',
      endTime: '13:00',
      duration: '2h',
      logFiles: 'logs_2025_03_29.txt',
      gmk: 'night_map.gmk',
      soldiersList: 'Mike, Anna, Zoe',
      location: 'Base Echo',
      configID: 'config_v1',
    },
    {
      name: 'Operation Nightfall',
      missionID: 'DEF456',
      startTime: '11:00',
      endTime: '13:00',
      duration: '2h',
      logFiles: 'logs_2025_03_29.txt',
      gmk: 'night_map.gmk',
      soldiersList: 'Mike, Anna, Zoe',
      location: 'Base Echo',
      configID: 'config_v1',
    },
    {
      name: 'Operation Nightfall',
      missionID: 'DEF456',
      startTime: '11:00',
      endTime: '13:00',
      duration: '2h',
      logFiles: 'logs_2025_03_29.txt',
      gmk: 'night_map.gmk',
      soldiersList: 'Mike, Anna, Zoe',
      location: 'Base Echo',
      configID: 'config_v1',
    },
    // Add more mission objects as needed...
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
            <MissionItem key={index} mission={mission} />
          ))}
        </div>

        <button className={styles.createReportBtn}>
          Create Report
        </button>
      </main>
    </div>
  );
}
