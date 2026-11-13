import { v4 as uuidv4 } from "uuid";

export type ChatRecord = {
    id: string;
    type: "usermessage" | "response" | "error" | "severe" | "expired";
    message: string;
    timestamp?: number;
};

// Keep the original storage key and record fields, including legacy histories.
export function readHistory(): ChatRecord[] {
    try {
        const value: unknown = JSON.parse(localStorage.getItem("chat_history") || "[]");
        if (!Array.isArray(value)) return [];
        return value.flatMap((item, index) => {
            if (!item || typeof item.message !== "string" || !["usermessage", "response", "error", "severe", "expired"].includes(item.type)) return [];
            const timestamp = typeof item.timestamp === "number" && Number.isFinite(new Date(item.timestamp).getTime()) ? item.timestamp : undefined;
            return [{ id: item.id || `legacy-${index}`, type: item.type, message: item.message, timestamp }];
        });
    } catch {
        return [];
    }
}

export function newRecord(type: ChatRecord["type"], message: string, id = uuidv4(), timestamp = Date.now()): ChatRecord {
    return { id, type, message, timestamp };
}

export function appendHistory(record: ChatRecord, authToken: string | null): Promise<void> {
    // All receiving tabs share the same event id; persist each broadcast once.
    return navigator.locks.request("update_chat", () => {
        if (localStorage.getItem("chat_auth_token") !== authToken) return;
        const history = readHistory();
        if (!history.some((item) => item.id === record.id)) {
            localStorage.setItem("chat_history", JSON.stringify([...history, record]));
        }
    });
}
