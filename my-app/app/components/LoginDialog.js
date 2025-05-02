"use client";
import { useState } from 'react';
import cls from '../styles/componentsDesign/LoginDialog.module.css';


export default function LoginDialog({ onClose, onSuccess }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.message || "Login failed");
      return;
    }

    onSuccess?.(data.user);  // notify parent
    onClose();               // close dialog
  }

  return (
    <div className={cls.overlay} >
      <div className={cls.card} onClick={(e) => e.stopPropagation()}>
        <button className={cls.closeBtn} onClick={onClose}>
          &times;
        </button>

        <h2 className={cls.cardTitle}>Sign in</h2>

        {error && <p className={cls.errorMsg}>{error}</p>}

        <form className={cls.form} onSubmit={handleSubmit}>
          <div className={cls.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={cls.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className={cls.submitBtn}>
            Log in
          </button>
        </form>
      </div>
    </div>
  );
}
