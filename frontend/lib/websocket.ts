"use client";

import { useEffect, useRef } from "react";
import { WS_BASE, getToken } from "./api";
import type { WSEvent } from "./types";

type Listener = (event: WSEvent) => void;

class WSClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  connect() {
    const token = getToken();
    if (!token) return;
    if (this.socket && this.socket.readyState <= 1) return; // already open/connecting

    this.socket = new WebSocket(`${WS_BASE}/ws?token=${token}`);

    this.socket.onopen = () => {
      this.pingInterval = setInterval(() => {
        this.send({ type: "ping" });
      }, 25000);
    };

    this.socket.onmessage = (event) => {
      try {
        const data: WSEvent = JSON.parse(event.data);
        this.listeners.forEach((l) => l(data));
      } catch {
        /* ignore malformed */
      }
    };

    this.socket.onclose = () => {
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.reconnectTimer = setTimeout(() => this.connect(), 2000);
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.socket?.close();
    this.socket = null;
  }

  send(data: Record<string, unknown>) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const wsClient = new WSClient();

export function useWebSocket(onEvent: Listener) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    wsClient.connect();
    const unsubscribe = wsClient.subscribe((e) => handlerRef.current(e));
    return unsubscribe;
  }, []);
}
