import { useState } from "react";
import { Session, ResearchResult, TraceEntry } from "../types";

const STORAGE_KEY = "research-sessions";
const MAX_SESSIONS = 10;

function loadSessions(): Session[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function useSessionHistory() {
  const [sessions, setSessions] = useState<Session[]>(loadSessions);

  const saveSession = (result: ResearchResult, traces: TraceEntry[]) => {
    const session: Session = {
      id: crypto.randomUUID(),
      query: result.query,
      timestamp: new Date().toISOString(),
      result,
      traces,
    };
    setSessions((prev) => {
      const updated = [session, ...prev].slice(0, MAX_SESSIONS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSessions([]);
  };

  return { sessions, saveSession, deleteSession, clearAll };
}
