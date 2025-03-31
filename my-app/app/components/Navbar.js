"use client";

import { useState } from "react";
import Link from 'next/link';
import styles from '../styles/componentsDesign/Navbar.module.css';
import LoginDialog from '../components/LoginDialog.js';

export default function Navbar() {
  const [showDialog, setShowDialog] = useState(false);

  const openDialog = () => setShowDialog(true);
  const closeDialog = () => setShowDialog(false);

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
      <button className={styles.logoutBtn} onClick={openDialog}>
        Log In
      </button>
      {showDialog && <LoginDialog onClose={closeDialog} />}
    </nav>
  );
}
