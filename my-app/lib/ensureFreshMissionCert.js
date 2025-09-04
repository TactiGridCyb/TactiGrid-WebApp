// lib/provision/ensureFreshMissionCert.js
import mongoose       from 'mongoose';
import forge          from 'node-forge';
import dbConnect      from '@/lib/mongoose';
import Certificate    from '@/models/Certificate';
import RevokedCert    from '@/models/RevokedCert';
import Soldier        from '@/models/Soldier';
import { issueCertificate } from '@/lib/issueCertificate';

/**
 * Ensure a fresh, unique cert for (soldierId, missionId):
 *  - revoke any existing cert(s) for that pair
 *  - delete the old cert docs
 *  - issue and persist a new cert
 *
 * @param {Object} args
 * @param {string} args.soldierId - Soldier ObjectId (string)
 * @param {string} args.missionId - Mission ObjectId (string)
 * @returns {Promise<{doc: any, revokedSerials: string[]}>}
 */
export async function ensureFreshMissionCert({ soldierId, missionId }) {
  await dbConnect();

  const sid = new mongoose.Types.ObjectId(soldierId);
  const mid = new mongoose.Types.ObjectId(missionId);

  // 0) Fetch soldier info needed for issuing the cert
  const soldier = await Soldier.findById(sid, { fullName: 1, role: 1, isCommander: 1 });
  if (!soldier) throw new Error(`Soldier not found: ${soldierId}`);

  const isCommander =
    soldier?.isCommander === true || String(soldier?.role).toLowerCase() === 'commander';

  // 1) Find any existing cert(s) for this (soldier, mission) pair
  const existing = await Certificate.find({ subjectId: sid, missionId: mid });

  const revokedSerials = [];
  if (existing.length) {
    // Make sure we have a unique index on the revoked serials
    await RevokedCert.collection.createIndex({ serial: 1 }, { unique: true });

    // 1a) Revoke all we found (robust to duplicates)
    for (const cert of existing) {
      try {
        const parsed = forge.pki.certificateFromPem(cert.certPem);
        const serial = parsed.serialNumber;

        // upsert into RevokedCert (idempotent)
        await RevokedCert.updateOne(
          { serial },
          { $setOnInsert: { serial }, $set: { revokedAt: new Date() } },
          { upsert: true }
        );

        revokedSerials.push(serial);
      } catch (e) {
        // If a PEM is malformed, skip but don't kill the run
        console.error('Failed parsing certPem for revocation:', e);
      }
    }

    // 1b) Remove the old cert docs so we keep exactly one active per pair
    await Certificate.deleteMany({ _id: { $in: existing.map(c => c._id) } });
  }

  // 2) Issue a brand-new certificate
  const signed = await issueCertificate({
    fullName: soldier.fullName,
    subjectId: sid,
    isCommander
  });

  // 3) Persist the new certificate
  const doc = await Certificate.create({
    subjectId:   sid,
    fullName:    soldier.fullName,
    isCommander,
    missionId:   mid,
    ...signed, // certPem, keyPem, serialNumber, validFrom, validTo
  });

  // 4) Return what happened
  return {
    doc: {
      _id:          doc._id,
      serialNumber: doc.serialNumber,
      validFrom:    doc.validFrom,
      validTo:      doc.validTo,
      certPem:      doc.certPem,
      keyPem:       doc.keyPem,
    },
    revokedSerials,
  };
}
