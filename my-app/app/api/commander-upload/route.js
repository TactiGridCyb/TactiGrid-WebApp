import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import forge from "node-forge";
import crypto from "crypto";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;
const CA_PASS = "12345"; // ✅ Confirmed correct password

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
      console.log(`🛰️ Commander UDP listening on ${address}:${port}`);
    });

    udpServer.on("message", async (msg, rinfo) => {
      try {
        const payload = JSON.parse(msg.toString());

        switch (payload.type) {
          case "certificate":
            commanderCertPem = payload.content;
            console.log("✅ Received Commander Certificate");
            break;

          case "gmk":
            encryptedGmkB64 = payload.content;
            console.log("✅ Received Encrypted GMK");
            break;

          case "log":
            logPacket = payload.content;
            console.log("✅ Received Encrypted Log");

            if (commanderCertPem && encryptedGmkB64 && logPacket) {
                console.log("🚀 Processing mission upload...");

                // Step 1: Check certificate
                const res = await fetch("http://localhost:3000/api/cert/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ certPem: commanderCertPem }),
                });
                const certResult = await res.json();

                if (!certResult.valid) {
                  console.log("❌ Certificate is revoked");
                  const message = Buffer.from("❌ Certificate is revoked");
                  udpServer.send(message, rinfo.port, rinfo.address);
                  return;
                }

                // Step 2: Check mission
                const client = new MongoClient(uri);
                await client.connect();
                const db = client.db(dbName);
                const mission = await db.collection("missions").findOne({ missionId: logPacket.missionId });

                if (!mission) {
                  console.log("❌ Mission not found:", logPacket.missionId);
                  const message = Buffer.from("❌ Mission not found");
                  udpServer.send(message, rinfo.port, rinfo.address);
                  await client.close();
                  return;
                }
                await client.close();

                // Step 3: All checks passed — proceed
                await revokeCommanderCertificate(commanderCertPem);
                const gmk = await decryptGMK(encryptedGmkB64);
                const decryptedLog = decryptLogWithGMK(logPacket.data, gmk);
                const logId = await insertDecryptedLog(decryptedLog, logPacket);
                await updateMission(logPacket.missionId, logId);

                const message = Buffer.from("✅ Upload complete. Mission updated, log saved, cert revoked.");
                udpServer.send(message, rinfo.port, rinfo.address);

                commanderCertPem = null;
                encryptedGmkB64 = null;
                logPacket = null;
              }

            break;
        }
      } catch (err) {
        console.error("❌ UDP handling error:", err.message);
      }
    });

    udpServer.bind(5556, "0.0.0.0");
    isCommanderUDPStarted = true;
  }

  return NextResponse.json({ status: "Commander UDP server running on 0.0.0.0:5556" });
}

export async function GET() {
  return NextResponse.json({ status: "OK" });
}

async function verifyCommanderCertificate(certPem) {
  const res = await fetch("http://localhost:3000/api/cert/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ certPem }),
  });
  const json = await res.json();
  return json.valid;
}

async function revokeCommanderCertificate(certPem) {
  const res = await fetch("http://localhost:3000/api/cert/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ certPem }),
  });
  const json = await res.json();
  console.log("🔒 Revoked cert serial:", json.serial);
}

async function decryptGMK(encryptedB64) {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const caDoc = await db.collection("CA").findOne({ _id: "root-ca" });
  const pki = forge.pki;

  const privateKey = pki.decryptRsaPrivateKey(caDoc.privateKey, CA_PASS);
  if (!privateKey) throw new Error("❌ Failed to decrypt CA private key.");

  const encryptedBytes = Buffer.from(encryptedB64, "base64");
  const decryptedBytes = privateKey.decrypt(encryptedBytes, "RSA-OAEP", {
    md: forge.md.sha256.create(),
    mgf1: forge.mgf.mgf1.create(forge.md.sha256.create()),
  });

  await client.close();
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

async function insertDecryptedLog(decryptedLog, logPacket) {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const userId = logPacket.commanderId || "unknown_commander";
  const sessionId = logPacket.missionId || `session-${Date.now()}`;

  const result = await db.collection("logs").insertOne({
    log: decryptedLog,
    createdAt: new Date(),
    userId,
    sessionId,
  });

  await client.close();
  return result.insertedId.toString();
}

async function updateMission(missionId, logId) {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const mission = await db.collection("missions").findOne({ missionId });
  if (!mission) {
    console.warn("⚠️ Mission not found:", missionId);
    await client.close();
    return;
  }

  const endTime = new Date();
  const startTime = new Date(mission.startTime);
  const durationMs = endTime - startTime;
  const duration = formatDuration(durationMs);

  await db.collection("missions").updateOne(
    { missionId },
    {
      $set: {
        endTime,
        duration,
        logFiles: logId,
      },
    }
  );

  await client.close();
}

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h${remaining}m`;
}
