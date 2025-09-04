"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import cls from "../styles/componentsDesign/LoginDialog.module.css";

export default function LoginDialog({ onClose, onSuccess }) {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // make sure auth cookie is set
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.message || "Login failed");
      return;
    }

    onSuccess?.(data.user); // notify parent
    onClose();              // close dialog UI

    // Re-render the current route so middleware + server fetches run with the new cookie
    setTimeout(() => router.refresh(), 0);
  }

  return (
    <div
      className={cls.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
    >
      <div className={cls.card} onClick={(e) => e.stopPropagation()}>
        <button className={cls.closeBtn} onClick={onClose} aria-label="Close">
          &times;
        </button>

        <h2 id="login-title" className={cls.cardTitle}>Sign&nbsp;in</h2>

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
            Log&nbsp;in
          </button>
        </form>
      </div>
    </div>
  );
}
