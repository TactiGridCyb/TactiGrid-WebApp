// app/api/udp-listener/route.js

import { NextResponse } from "next/server";

let isServerStarted = false;
let lastMessage = "";
let udpServer = null; // store the server instance

export async function POST() {
  if (isServerStarted) {
    return NextResponse.json({ status: "UDP server is already running" });
  }

  const dgram = require("dgram");
  udpServer = dgram.createSocket("udp4");

  udpServer.on("message", (msg, info) => {
    lastMessage = msg.toString();
    console.log(`Received UDP message from ${info.address}:${info.port}`);
    console.log(`Message content: ${lastMessage}`);
  });

  udpServer.on("error", (err) => {
    console.error("UDP server error:", err);
    udpServer.close();
  });

  // Bind to port 5050
  udpServer.bind(5050, () => {
    console.log("UDP server listening on port 5050");
  });

  isServerStarted = true;
  return NextResponse.json({ status: "UDP server started on port 5050" });
}

export async function GET() {
  // Return the most recently received UDP message
  return NextResponse.json({ message: lastMessage });
}
