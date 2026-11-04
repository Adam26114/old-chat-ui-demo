type RecaptchaApi = {
    ready(callback: () => void): void;
    execute?: (siteKey: string, options: { action: string }) => Promise<string>;
};

declare global {
    interface Window { grecaptcha?: RecaptchaApi; }
}

const sdkLoads = new Map<string, Promise<RecaptchaApi>>();

function loadSdk(siteKey: string): Promise<RecaptchaApi> {
    if (window.grecaptcha?.ready) return Promise.resolve(window.grecaptcha);
    const existing = sdkLoads.get(siteKey);
    if (existing) return existing;

    const promise = new Promise<RecaptchaApi>((resolve, reject) => {
        const url = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
        const hostScript = [...document.scripts].find((script) => script.src === url);
        const script = hostScript || document.createElement("script");
        const finish = (error?: Error) => {
            clearTimeout(timeout);
            script.removeEventListener("load", loaded);
            script.removeEventListener("error", failed);
            const api = window.grecaptcha;
            if (error || !api?.ready) {
                if (!hostScript) script.remove();
                reject(error || new Error("reCAPTCHA SDK unavailable"));
            } else resolve(api);
        };
        const loaded = () => finish();
        const failed = () => finish(new Error("reCAPTCHA SDK failed to load"));
        const timeout = setTimeout(() => finish(new Error("reCAPTCHA SDK timed out")), 10000);
        script.addEventListener("load", loaded);
        script.addEventListener("error", failed);
        if (!hostScript) {
            script.src = url;
            script.async = true;
            document.head.appendChild(script);
        }
    });
    sdkLoads.set(siteKey, promise);
    void promise.catch(() => { sdkLoads.delete(siteKey); });
    return promise;
}

async function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
    signal.throwIfAborted();
    let aborted: () => void = () => {};
    try {
        return await Promise.race([promise, new Promise<never>((_resolve, reject) => {
            aborted = () => reject(signal.reason);
            signal.addEventListener("abort", aborted, { once: true });
        })]);
    } finally {
        signal.removeEventListener("abort", aborted);
    }
}

export async function verifyUserMessage(siteKey: string, endpoint: string, signal: AbortSignal): Promise<void> {
    if (!siteKey || !endpoint) return;
    const api = await abortable(loadSdk(siteKey), signal);
    await abortable(new Promise<void>((resolve) => api.ready(resolve)), signal);
    signal.throwIfAborted();
    const readyApi = window.grecaptcha;
    if (!readyApi?.execute) throw new Error("reCAPTCHA SDK unavailable");
    const token = await abortable(readyApi.execute(siteKey, { action: "usermessage" }), signal);
    signal.throwIfAborted();
    if (typeof token !== "string" || !token.trim()) throw new Error("Missing reCAPTCHA token");
    const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }), signal,
    });
    if (!response.ok) throw new Error("Verification request failed");
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("success" in data) || data.success !== true) {
        throw new Error("Verification rejected");
    }
}
