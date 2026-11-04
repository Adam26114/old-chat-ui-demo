export function formatChatError(message: string): string {
    const code = message === "invalid _structure" ? "invalid_structure" : message;
    if (code === "user_info") return "Error: unable to retrieve user information";
    if (["invalid_llm_settings", "missing_parameters", "invalid_structure"].includes(code)) {
        return `Error: server misconfiguration (${code})`;
    }
    return `Unknown error: ${message}`;
}
