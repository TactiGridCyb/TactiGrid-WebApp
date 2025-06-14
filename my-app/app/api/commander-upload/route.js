import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import forge from "node-forge";
import crypto from "crypto";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;
const CA_PASS = "12345";

let isCommanderUDPStarted = false;
let commanderCertPem = null;
let encryptedGmkB64 = null;
let encryptedLogB64 = null;

export async function POST() {
  if (!isCommanderUDPStarted) {
    const dgram = require("dgram");
    const udpServer = dgram.createSocket("udp4");

    udpServer.on("message", async (msg, rinfo) => {
      try {
        const payload = JSON.parse(msg.toString());

        if (payload.type === "certificate") {
          commanderCertPem = payload.content;
          console.log("✅ Received Commander Certificate");
        } else if (payload.type === "gmk") {
          encryptedGmkB64 = payload.content;
          console.log("✅ Received Encrypted GMK");
        } else if (payload.type === "log") {
          encryptedLogB64 = payload.content;
          console.log("✅ Received Encrypted Log");

          if (commanderCertPem && encryptedGmkB64 && encryptedLogB64) {
            console.log("🚀 Processing mission upload...");

            const valid = await verifyCommanderCertificate(commanderCertPem);
            if (!valid) {
              console.log("❌ Certificate is revoked");
              udpServer.send(Buffer.from("❌ Certificate is revoked"), rinfo.port, rinfo.address);
              return;
            }

            const gmkKey = await decryptGMK(encryptedGmkB64);
            const decryptedLog = decryptLogWithGMK(encryptedLogB64, gmkKey);
            const missionName = decryptedLog.missionName;

            const client = new MongoClient(uri);
            await client.connect();
            const db = client.db(dbName);
            const mission = await db.collection("missions").findOne({ missionName });

            if (!mission) {
              console.log("❌ Mission not found:", missionName);
              udpServer.send(Buffer.from("❌ Mission not found"), rinfo.port, rinfo.address);
              await client.close();
              return;
            }

            const { Interval, Data, Events } = decryptedLog;

            const log = {
              Interval,
              Mission: mission._id,
              Data,
              Events: Events || [],
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            await db.collection("logs").insertOne(log);

            const now = new Date();
            await db.collection("missions").updateOne(
              { _id: mission._id },
              {
                $set: {
                  EndTime: now,
                  Duration: Math.floor((now - new Date(mission.StartTime)) / 1000),
                  IsFinished: true,
                },
              }
            );

            await revokeCommanderCertificate(commanderCertPem);
            udpServer.send(Buffer.from("✅ Upload complete"), rinfo.port, rinfo.address);

            commanderCertPem = null;
            encryptedGmkB64 = null;
            encryptedLogB64 = null;
            await client.close();
          }
        }
      } catch (err) {
        console.error("❌ UDP handler error:", err.message);
      }
    });

    udpServer.bind(5556, "0.0.0.0");
    isCommanderUDPStarted = true;
    console.log("🛰️ Commander UDP listening on port 5556");
  }

  return NextResponse.json({ status: "Commander UDP server running" });
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

  const decrypted = privateKey.decrypt(
    Buffer.from(encryptedB64, "base64"),
    "RSA-OAEP",
    {
      md: forge.md.sha256.create(),
      mgf1: forge.mgf.mgf1.create(forge.md.sha256.create()),
    }
  );

  await client.close();
  return Buffer.from(decrypted, "binary");
}

function decryptLogWithGMK(encryptedBase64, gmkKey) {
  const decipher = crypto.createDecipheriv("aes-256-ecb", gmkKey, null);
  decipher.setAutoPadding(true);
  let decrypted = decipher.update(Buffer.from(encryptedBase64, "base64"), "base64", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}
