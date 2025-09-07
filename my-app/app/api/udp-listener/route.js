// app/api/udp-listener/route.js

import { NextResponse } from "next/server";

let isServerStarted = false;
let lastMessage = "";
let udpServer = null; 

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

  udpServer.bind(5555,"192.168.1.202", () => {
    console.log("UDP server listening on port 5555");
  });

  isServerStarted = true;
  return NextResponse.json({ status: "UDP server started on port 5555" });
}

export async function GET() {
  return NextResponse.json({ message: lastMessage });
}
