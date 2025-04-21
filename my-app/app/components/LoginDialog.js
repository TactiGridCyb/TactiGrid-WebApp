"use client";
import { useState } from 'react';
import styles from '../styles/componentsDesign/LoginDialog.module.css';

export default function LoginDialog({ onClose, onSuccess }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.message || 'Login failed');
      return;
    }

    onSuccess(data.user);   // tell Navbar
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        <h2 className={styles.cardTitle}>Log In</h2>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <label>Email
            <input type="email" value={email}
                   onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label>Password
            <input type="password" value={password}
                   onChange={(e) => setPassword(e.target.value)} required />
          </label>

          <button type="submit" className={styles.submitBtn}>Sign in</button>
        </form>
      </div>
    </div>
  );
}
