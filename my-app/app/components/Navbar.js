import Link from 'next/link';
import styles from '../styles/componentsDesign/Navbar.module.css';

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <ul>
        <li>
          <Link href="/">Home</Link>
        </li>
        <li>
          <Link href="/old-missions">View old Missions</Link>
        </li>
        <li>
          <Link href="/create-mission">Create new Mission</Link>
        </li>
        <li>
          <Link href="/upload-missions">Upload Missions</Link>
        </li>
        <li>
          <Link href="/config">Configuration</Link>
        </li>
      </ul>
      <button className={styles.logoutBtn}>Log In</button>
    </nav>
  );
}
