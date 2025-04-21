"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../styles/componentsDesign/Navbar.module.css';
import LoginDialog from '../components/LoginDialog';

export default function Navbar() {
  const [showDialog, setShowDialog] = useState(false);
  const [user, setUser]             = useState(null);

  // On first mount ask the backend “who am I?”
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <nav className={styles.navbar}>
      <ul>
        <li><Link href="/">Home</Link></li>
        <li><Link href="/old-missions">View old Missions</Link></li>
        <li><Link href="/create-mission">Create new Mission</Link></li>
        <li><Link href="/upload-missions">Upload Missions</Link></li>
        <li><Link href="/config">Configuration</Link></li>
        <li><Link href="/statistics">Statistics</Link></li>
      </ul>

      {user ? (
        <>
          <span className={styles.greeting}>Hello&nbsp;{user.email}</span>
          <button className={styles.logoutBtn} onClick={logout}>Logout</button>
        </>
      ) : (
        <button className={styles.logoutBtn} onClick={() => setShowDialog(true)}>
          Log In
        </button>
      )}

      {showDialog && (
        <LoginDialog
          onClose={() => setShowDialog(false)}
          onSuccess={(u) => setUser(u)}
        />
      )}
    </nav>
  );
}
