import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import forge from "node-forge";
import crypto from "crypto";
import { interCaLoader } from "@/lib/interCaLoader";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;
const CA_PASS = process.env.CA_KEY_PASS;

let isCommanderUDPStarted = false;
let commanderCertPem = null;
let encryptedGmkB64 = null;
let logPacket = null;

export async function POST() {
  if (!isCommanderUDPStarted) {
    const dgram = require("dgram");
    const udpServer = dgram.createSocket("udp4");

    udpServer.on("listening", () => {
      const { address, port } = udpServer.address();
      console.log(`Commander UDP listening on ${address}:${port}`);
    });

    udpServer.on("message", async (msg, rinfo) => {
      try {
        const payload = JSON.parse(msg.toString());

        switch (payload.type) {
          case "certificate":
            commanderCertPem = payload.content;
            console.log("Received Commander Certificate");
            break;

          case "gmk":
            encryptedGmkB64 = payload.content;
            console.log("Received Encrypted GMK");
            break;

          case "log":
            logPacket = payload.content;
            console.log("Received Encrypted Log");

            if (commanderCertPem && encryptedGmkB64 && logPacket) {
              console.log("Processing mission upload...");

              const client = new MongoClient(uri);
              await client.connect();
              const db = client.db(dbName);

              const v = await verifyCommanderCertificate(
                commanderCertPem,
                logPacket.missionId,
                db
              );

              if (!v.valid) {
                console.log("Commander verification failed:", v.reason);
                udpServer.send(
                  Buffer.from(`Certificate rejected: ${v.reason}`),
                  rinfo.port,
                  rinfo.address
                );
                await client.close();
                return;
              }

              const mission = await db
                .collection("missions")
                .findOne({ missionId: String(logPacket.missionId) });

              if (!mission) {
                console.log("Mission not found:", logPacket.missionId);
                udpServer.send(
                  Buffer.from("Mission not found"),
                  rinfo.port,
                  rinfo.address
                );
                await client.close();
                return;
              }

              await revokeCommanderCertificate(commanderCertPem);

              const gmk = await decryptGMK(encryptedGmkB64);
              const decryptedLog = decryptLogWithGMK(logPacket.data, gmk);

              const logId = await insertDecryptedLog(db, decryptedLog, logPacket);
              await updateMission(db, logPacket.missionId, logId);

              udpServer.send(
                Buffer.from("Upload complete. Mission updated, log saved, cert revoked."),
                rinfo.port,
                rinfo.address
              );

              await client.close();

              commanderCertPem = null;
              encryptedGmkB64 = null;
              logPacket = null;
            }

            break;
        }
      } catch (err) {
        console.error("UDP handling error:", err.message);
      }
    });

    udpServer.bind(5556, "0.0.0.0");
    isCommanderUDPStarted = true;
  }

  return NextResponse.json({
    status: "Commander UDP server running on 0.0.0.0:5556",
  });
}

export async function GET() {
  return NextResponse.json({ status: "OK" });
}

async function verifyCommanderCertificate(certPem, expectedMissionId, db) {
  const res = await fetch("http://localhost:3000/api/cert/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ certPem }),
  });
  const { valid } = await res.json();
  if (!valid) return { valid: false, reason: "revoked-or-expired" };

  let serial;
  try {
    serial = forge.pki.certificateFromPem(certPem).serialNumber;
  } catch {
    return { valid: false, reason: "invalid-pem" };
  }

  let certDoc =
    (await db.collection("certificates").findOne({ serialNumber: serial })) ||
    (await db.collection("certs").findOne({ serialNumber: serial }));

  if (!certDoc) return { valid: false, reason: "cert-not-found" };

  if (
    expectedMissionId &&
    String(certDoc.missionId) !== String(expectedMissionId)
  ) {
    return {
      valid: false,
      reason: "mission-mismatch",
      expected: String(expectedMissionId),
      got: String(certDoc.missionId),
    };
  }

  const soldier = await db
    .collection("soldiers")
    .findOne(
      { _id: certDoc.subjectId },
      { projection: { isCommander: 1, fullName: 1 } }
    );

  if (!soldier) return { valid: false, reason: "soldier-not-found" };
  if (!soldier.isCommander) return { valid: false, reason: "soldier-not-commander" };

  return {
    valid: true,
    subjectId: String(certDoc.subjectId),
    fullName: soldier.fullName || certDoc.fullName,
    missionId: String(certDoc.missionId),
    serialNumber: serial,
  };
}

async function revokeCommanderCertificate(certPem) {
  const res = await fetch("http://localhost:3000/api/cert/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ certPem }),
  });
  const json = await res.json();
  console.log("Revoked cert serial:", json.serial);
}

async function decryptGMK(encryptedB64) {
  const pki = forge.pki;
  const { keyPem } = await interCaLoader();
  const privateKey = pki.privateKeyFromPem(keyPem);
  const encryptedBytes = forge.util.decode64(encryptedB64);
  const decryptedBytes = privateKey.decrypt(encryptedBytes, "RSA-OAEP", {
    md: forge.md.sha256.create(),
    mgf1: forge.mgf.mgf1.create(forge.md.sha256.create()),
  });
  return Buffer.from(decryptedBytes, "binary");
}

function decryptLogWithGMK(encryptedBase64, gmkKey) {
  const encryptedBuffer = Buffer.from(encryptedBase64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-ecb", gmkKey, null);
  decipher.setAutoPadding(true);
  let decrypted = decipher.update(encryptedBuffer, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}

async function insertDecryptedLog(db, decryptedLog, logPacket) {
  const userId = logPacket.commanderId || "unknown_commander";
  const sessionId = String(logPacket.missionId || `session-${Date.now()}`);
  const result = await db.collection("logs").insertOne({
    log: decryptedLog,
    createdAt: new Date(),
    userId,
    sessionId,
  });
  return result.insertedId.toString();
}

async function updateMission(db, missionId, logId) {
  const mission = await db.collection("missions").findOne({ missionId: String(missionId) });
  if (!mission) {
    console.warn("Mission not found:", missionId);
    return;
  }
  const endTime = new Date();
  const startTime = new Date(mission.startTime);
  const durationMs = endTime - startTime;
  const duration = formatDuration(durationMs);
  await db.collection("missions").updateOne(
    { missionId: String(missionId) },
    {
      $set: {
        endTime,
        duration,
        logFiles: logId,
      },
    }
  );
}

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h${remaining}m`;
}
