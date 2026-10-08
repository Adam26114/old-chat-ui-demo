import { v4 as uuidv4 } from "uuid";

export type ChatRecord = {
    id: string;
    type: "usermessage" | "response" | "error" | "expired";
    message: string;
};

// Keep the original storage key and record fields, including legacy histories.
export function readHistory(): ChatRecord[] {
    try {
        const value: unknown = JSON.parse(localStorage.getItem("chat_history") || "[]");
        if (!Array.isArray(value)) return [];
        return value.flatMap((item, index) => {
            if (!item || typeof item.message !== "string" || !["usermessage", "response", "error", "expired"].includes(item.type)) return [];
            return [{ id: item.id || `legacy-${index}`, type: item.type, message: item.message }];
        });
    } catch {
        return [];
    }
}

export function newRecord(type: ChatRecord["type"], message: string, id = uuidv4()): ChatRecord {
    return { id, type, message };
}

export function appendHistory(record: ChatRecord): Promise<void> {
    // All receiving tabs share the same event id; persist each broadcast once.
    return navigator.locks.request("update_chat", () => {
        const history = readHistory();
        if (!history.some((item) => item.id === record.id)) {
            localStorage.setItem("chat_history", JSON.stringify([...history, record]));
        }
    });
}
