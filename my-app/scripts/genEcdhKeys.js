/**
 * scripts/genEcdhKeys.js
 *
 * דוגמה כיצד ליצור זוג מפתחות ECDH (prime256v1),
 * ואז להדפיס אותם כ־hex (private ו־public).
 */

import crypto from 'crypto';

// צור מופע ECDH על עקומת prime256v1
const ecdh = crypto.createECDH('prime256v1');

// צרו מפתח פרטי ופרטי עם קריאה ל־generateKeys
const publicKey  = ecdh.generateKeys();   // Buffer של נקודת public
const privateKey = ecdh.getPrivateKey(); // Buffer של private key

// אפשר להמיר ל־hex כדי לשמור או להציג
console.log('Private Key (hex):', privateKey.toString('hex'));
console.log('Public Key  (hex):', publicKey.toString('hex'));

// אם תרצו לשמור ל־.env או למסד הנתונים, מאחסנים את שני הערכים הללו.
