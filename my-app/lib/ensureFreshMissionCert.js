// lib/provision/ensureFreshMissionCert.js
import mongoose       from 'mongoose';
import forge          from 'node-forge';
import dbConnect      from '@/lib/mongoose';
import Certificate    from '@/models/Certificate';
import RevokedCert    from '@/models/RevokedCert';
import Soldier        from '@/models/Soldier';
import { issueCertificate } from '@/lib/issueCertificate';


export async function ensureFreshMissionCert({ soldierId, missionId }) {
  await dbConnect();

  const sid = new mongoose.Types.ObjectId(soldierId);
  const mid = new mongoose.Types.ObjectId(missionId);

  const soldier = await Soldier.findById(sid, { fullName: 1, role: 1, isCommander: 1 });
  if (!soldier) throw new Error(`Soldier not found: ${soldierId}`);

  const isCommander =
    soldier?.isCommander === true || String(soldier?.role).toLowerCase() === 'commander';

  const existing = await Certificate.find({ subjectId: sid, missionId: mid });

  const revokedSerials = [];
  if (existing.length) {
    await RevokedCert.collection.createIndex({ serial: 1 }, { unique: true });

    for (const cert of existing) {
      try {
        const parsed = forge.pki.certificateFromPem(cert.certPem);
        const serial = parsed.serialNumber;

        await RevokedCert.updateOne(
          { serial },
          { $setOnInsert: { serial }, $set: { revokedAt: new Date() } },
          { upsert: true }
        );

        revokedSerials.push(serial);
      } catch (e) {
        console.error('Failed parsing certPem for revocation:', e);
      }
    }

    await Certificate.deleteMany({ _id: { $in: existing.map(c => c._id) } });
  }

  const signed = await issueCertificate({
    fullName: soldier.fullName,
    subjectId: sid,
    isCommander
  });

  const doc = await Certificate.create({
    subjectId:   sid,
    fullName:    soldier.fullName,
    isCommander,
    missionId:   mid,
    ...signed, 
  });

  
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
