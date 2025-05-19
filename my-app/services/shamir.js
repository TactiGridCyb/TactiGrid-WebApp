export function evalPolynomial(coeffs, x, prime) {
  // Horner’s method, iterating from highest-degree → constant:
  let result = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) {
    result = (result * x + coeffs[i]) % prime;
  }
  return result;
}
  
  export function interpolate(points, prime) {
    let secret = 0;
    for (let j = 0; j < points.length; j++) {
      const [xj, yj] = points[j];
      let num = 1, den = 1;
      for (let m = 0; m < points.length; m++) {
        if (m === j) continue;
        const [xm] = points[m];
        num = (num * (0 - xm + prime)) % prime;
        den = (den * (xj - xm + prime)) % prime;
      }
      const invDen = modInverse(den, prime);
      secret = (secret + yj * num * invDen) % prime;
    }
    return secret;
  }
  
  function modInverse(a, m) {
    // Fermat's little theorem (m prime)
    return powMod(a, m - 2, m);
  }
  
  function powMod(base, exp, mod) {
    let res = 1;
    base = base % mod;
    while (exp > 0) {
      if (exp & 1) res = (res * base) % mod;
      base = (base * base) % mod;
      exp >>= 1;
    }
    return res;
  }
  
  // Split a Uint8Array secret into n shares, threshold k
  export function splitSecret(secretBytes, n, k, prime = 257) {
    const shares = Array.from({ length: n }, () => []);
    for (const byte of secretBytes) {
      // generate random polynomial coeffs, constant=byte
      const coeffs = [byte];
      for (let i = 1; i < k; i++) {
        coeffs.push(Math.floor(Math.random() * prime));
      }
      for (let idx = 1; idx <= n; idx++) {
        const y = evalPolynomial(coeffs, idx, prime);
        shares[idx - 1].push([idx, y]);
      }
    }
    return shares;
  }
  
  // Reconstruct Uint8Array secret from k shares ([[x,y],…])
  export function reconstructSecret(shares, prime = 257) {
    if (shares.length === 0) return new Uint8Array();
    const length = shares[0].length;
    const bytes = [];
    for (let i = 0; i < length; i++) {
      const points = shares.map(share => share[i]);
      const secret = interpolate(points, prime);
      bytes.push(secret);
    }
    return Uint8Array.from(bytes);
  }
  