import { expect, test, type Page, type APIRequestContext, type Route } from "@playwright/test";

const sdk = "https://www.google.com/recaptcha/api.js?render=fixture-site-key";
const endpoint = "http://127.0.0.1:4181/verify";
const failure = "We couldn’t verify your message. Please try again.";
const sdkCode = `window.__captchaActions = []; window.grecaptcha = {
    ready: callback => callback(),
    execute: (key, options) => {
        window.__captchaActions.push(options.action);
        return Promise.resolve('fixture-token-' + window.__captchaActions.length);
    }
};`;
const cors = { "Access-Control-Allow-Origin": "http://127.0.0.1:4180", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" };

async function verifier(page: Page, respond: (route: Route) => Promise<void>, code = sdkCode) {
    await page.route(sdk, (route) => route.fulfill({ contentType: "application/javascript", body: code }));
    await page.route(endpoint, async (route) => {
        if (route.request().method() === "OPTIONS") await route.fulfill({ status: 204, headers: cors });
        else await respond(route);
    });
}
async function open(page: Page, query = "") {
    await page.goto(`/tests/fixtures/index.html${query}`);
    await expect(page.getByText("Ready to help with your stay", { exact: true })).toBeAttached();
    await page.getByRole("button", { name: "Open chat", exact: true }).click();
}
async function sentCount(request: APIRequestContext) {
    return (await (await request.get("http://127.0.0.1:4181/stats")).json()).chatCount as number;
}
async function submit(page: Page, text: string) {
    const input = page.getByRole("textbox", { name: "Message", exact: true });
    await input.fill(text);
    await input.press("Enter");
    return input;
}

function guestMessage(page: Page, text: string) {
    return page.locator('[data-message-role="user"]').filter({ has: page.getByText(text, { exact: true }) });
}

test("pending state has only preparing feedback, then a dated real reply", async ({ page }) => {
    await open(page);
    await expect(page.locator('.chat-panel time')).toHaveCount(1);
    await submit(page, "Take your time");
    await expect(page.getByText("Preparing your reply…", { exact: true })).toBeVisible();
    await expect(page.locator('[data-message-role="assistant"]')).toHaveCount(1);
    await expect(page.locator('[data-message-role="assistant"] .chat-bubble')).toHaveText(/Welcome/);
    await expect(page.getByRole("table")).toBeVisible();
    const time = page.locator('[data-message-role="assistant"]').filter({ has: page.getByRole("table") }).locator("time");
    await expect(time).toHaveAttribute("datetime", /T/);
    await expect(time).toHaveAttribute("aria-label", /\d/);
    const instant = await time.getAttribute("datetime");
    await page.reload();
    await page.getByRole("button", { name: "Open chat", exact: true }).click();
    await expect(page.locator('[data-message-role="assistant"]').filter({ has: page.getByRole("table") }).locator("time")).toHaveAttribute("datetime", instant!);
    await expect(page.getByRole("button", { name: "Copy message" })).toHaveCount(0);
});

test("legacy history preserves severe errors and leaves unknown times blank", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("chat_history", JSON.stringify([
        { type: "response", message: "A previous conversation" },
        { type: "severe", message: "user_info" },
    ])));
    await open(page);
    const oldReply = page.locator('[data-message-role="assistant"]').filter({ hasText: "A previous conversation" });
    await expect(oldReply).toBeVisible();
    await expect(oldReply.locator("time")).toHaveCount(0);
    const error = page.locator('[data-message-role="assistant"]').filter({ hasText: "Error: unable to retrieve user information" });
    await expect(error).toBeVisible();
    await expect(error.locator("time")).toHaveCount(0);
});

test("severe and error events map correctly, suppress repeats, and reset for new turns", async ({ page }) => {
    await open(page);
    const cases = [
        ["user_info", "Error: unable to retrieve user information"],
        ["invalid_llm_settings", "Error: server misconfiguration (invalid_llm_settings)"],
        ["missing_parameters", "Error: server misconfiguration (missing_parameters)"],
        ["invalid_structure", "Error: server misconfiguration (invalid_structure)"],
        ["invalid _structure", "Error: server misconfiguration (invalid_structure)"],
        ["unexpected_code", "Unknown error: unexpected_code"],
    ];
    for (const [code, message] of cases) {
        await submit(page, `Fixture severe ${code}`);
        await expect(page.getByText(message, { exact: true }).last()).toBeVisible();
        await expect.poll(() => page.evaluate((code) => JSON.parse(localStorage.getItem("chat_history") || "[]").filter((record: { type: string; message: string }) => record.type === "severe" && record.message === code).length, code)).toBe(1);
    }
    await submit(page, "Fixture error user_info");
    await expect(page.getByText("Error: unable to retrieve user information", { exact: true })).toHaveCount(2);
    await submit(page, "Fixture error user_info");
    await expect(page.getByText("Error: unable to retrieve user information", { exact: true })).toHaveCount(3);
    await submit(page, "Repeat answer");
    await expect(page.getByText("The same answer.", { exact: true })).toHaveCount(1);
    await submit(page, "Repeat answer");
    await expect(page.getByText("The same answer.", { exact: true })).toHaveCount(2);
    await submit(page, "Error sequence");
    await expect(page.getByText("Error: unable to retrieve user information", { exact: true })).toHaveCount(5);
    await page.reload();
    await page.getByRole("button", { name: "Open chat", exact: true }).click();
    await expect(page.getByText("Unknown error: unexpected_code", { exact: true })).toBeVisible();
});

test("shared tabs use one timestamp and persist a broadcast once", async ({ page, context }) => {
    await open(page);
    const other = await context.newPage();
    await open(other);
    await submit(page, "Repeat answer");
    const first = page.locator('[data-message-role="assistant"]').filter({ hasText: "The same answer." });
    const second = other.locator('[data-message-role="assistant"]').filter({ hasText: "The same answer." });
    await expect(first).toHaveCount(1);
    await expect(second).toHaveCount(1);
    const instant = await first.locator("time").getAttribute("datetime");
    await expect(second.locator("time")).toHaveAttribute("datetime", instant!);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("chat_history") || "[]").filter((record: { message: string }) => record.message === "The same answer.").length)).toBe(1);
    await other.close();
});

test("absent or partial verification settings send without loading Google", async ({ page, request }) => {
    let sdkRequests = 0;
    page.on("request", (request) => { if (request.url().includes("google.com/recaptcha")) sdkRequests++; });
    const initial = await sentCount(request);
    for (const mode of ["none", "site", "endpoint"]) {
        await open(page, `?captcha=${mode}`);
        const text = `A question with ${mode} configuration`;
        await submit(page, text);
        await expect(guestMessage(page, text)).toHaveAttribute("data-verifying", "false");
        await expect(page.locator('[data-message-role="assistant"]').getByText(text, { exact: true })).toBeVisible();
    }
    expect(await sentCount(request)).toBe(initial + 3);
    expect(sdkRequests).toBe(0);
});

test("a pending bubble stays local and becomes the same sent bubble after verification", async ({ page, request, context }) => {
    let approve!: () => void;
    const gate = new Promise<void>((resolve) => { approve = resolve; });
    const tokens: string[] = [];
    await verifier(page, async (route) => {
        tokens.push(route.request().postDataJSON().token);
        await gate;
        await route.fulfill({ json: { success: true }, headers: cors });
    });
    await open(page, "?captcha=both");
    const other = await context.newPage();
    await open(other, "?captcha=both");
    const initial = await sentCount(request);
    const text = "Take your time";
    const bubble = guestMessage(page, text);
    const sendButton = page.getByRole("button", { name: "Send message", exact: true });
    const input = page.getByRole("textbox", { name: "Message", exact: true });
    await input.fill(text);
    await sendButton.click();
    try {
        await expect.poll(() => tokens.length).toBe(1);
        await expect(bubble.getByText("Verifying…", { exact: true })).toBeVisible();
        await expect(input).toHaveValue("");
        await expect(page.getByText("Preparing your reply…", { exact: true })).toHaveCount(0);
        await expect(guestMessage(other, text)).toHaveCount(0);
        expect(await sentCount(request)).toBe(initial);
        expect(await page.evaluate((message) => localStorage.getItem("chat_history")?.includes(message) ?? false, text)).toBe(false);
        await input.fill("A follow-up");
        await expect(sendButton).toBeDisabled();
        await input.press("Enter");
        await expect(input).toHaveValue("A follow-up");
        const pendingBubble = await bubble.elementHandle();
        const pendingColor = await bubble.locator(".chat-bubble").evaluate((element) => getComputedStyle(element).backgroundColor);
        approve();
        await expect(bubble.getByText("Verifying…", { exact: true })).toHaveCount(0);
        expect(await bubble.evaluate((element, previous) => element === previous, pendingBubble)).toBe(true);
        expect(await bubble.locator(".chat-bubble").evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(pendingColor);
    } finally {
        approve();
    }
    await expect(bubble).toHaveCount(1);
    await expect(page.getByText("Preparing your reply…", { exact: true })).toBeVisible();
    await expect(guestMessage(other, text)).toHaveCount(1);
    await expect(page.getByRole("table")).toBeVisible();
    await expect(input).toHaveValue("A follow-up");
    expect(await sentCount(request)).toBe(initial + 1);
    await expect.poll(() => page.evaluate((message) => JSON.parse(localStorage.getItem("chat_history") || "[]").filter((record: { type: string; message: string }) => record.type === "usermessage" && record.message === message).length, text)).toBe(1);
    expect(tokens).toEqual(["fixture-token-1"]);
    const actions = await page.evaluate(() => (window as unknown as { __captchaActions: string[] }).__captchaActions);
    expect(actions).toEqual(["usermessage"]);
});

test("a rejected verification restores the original draft plus new edits and can retry", async ({ page, request }) => {
    let finish: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { finish = resolve; });
    const tokens: string[] = [];
    await verifier(page, async (route) => {
        tokens.push(route.request().postDataJSON().token);
        if (tokens.length === 1) await gate;
        await route.fulfill({ json: { success: tokens.length > 1 }, headers: cors });
    });
    await open(page, "?captcha=both");
    const initial = await sentCount(request);
    const input = await submit(page, "Original question");
    await expect.poll(() => tokens.length).toBe(1);
    const bubble = guestMessage(page, "Original question");
    await expect(bubble.getByText("Verifying…", { exact: true })).toBeVisible();
    await input.fill("A new detail");
    finish!();
    await expect(page.getByRole("alert")).toHaveText(failure);
    await expect(bubble).toHaveCount(0);
    await expect(input).toHaveValue(/Original question[\s\S]*A new detail/);
    expect(await sentCount(request)).toBe(initial);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("chat_history") || "[]").some((record: { type: string }) => record.type === "usermessage"))).toBe(false);
    await input.press("Enter");
    await expect(page.getByRole("table")).toBeVisible();
    expect(tokens).toEqual(["fixture-token-1", "fixture-token-2"]);
    expect(await sentCount(request)).toBe(initial + 1);
});

test("SDK failure restores the draft and a later load can succeed", async ({ page, request }) => {
    let attempts = 0;
    await verifier(page, (route) => route.fulfill({ json: { success: true }, headers: cors }));
    await page.route(sdk, (route) => ++attempts === 1 ? route.abort() : route.fulfill({ contentType: "application/javascript", body: sdkCode }));
    await open(page, "?captcha=both");
    const initial = await sentCount(request);
    const input = await submit(page, "Try after SDK failure");
    await expect(page.getByRole("alert")).toHaveText(failure);
    await expect(input).toHaveValue("Try after SDK failure");
    expect(await sentCount(request)).toBe(initial);
    await input.press("Enter");
    await expect(page.getByRole("table")).toBeVisible();
    expect(attempts).toBe(2);
});

test("HTTP, malformed, and network verifier failures never emit a chat", async ({ page, request }) => {
    const modes = ["http", "json", "network", "not-boolean"];
    await verifier(page, (route) => {
        const mode = modes.shift();
        if (mode === "network") return route.abort();
        if (mode === "http") return route.fulfill({ status: 500, json: { success: true }, headers: cors });
        if (mode === "json") return route.fulfill({ body: "bad json", headers: cors });
        return route.fulfill({ json: { success: "true" }, headers: cors });
    });
    await open(page, "?captcha=both");
    const initial = await sentCount(request);
    const input = page.getByRole("textbox", { name: "Message", exact: true });
    for (let attempt = 0; attempt < 4; attempt++) {
        await submit(page, `Unsent attempt ${attempt}`);
        await expect(page.getByRole("alert")).toHaveText(failure);
        await expect(input).toHaveValue(`Unsent attempt ${attempt}`);
    }
    expect(await sentCount(request)).toBe(initial);
});

test("token timeout restores the draft without sending", async ({ page, request }) => {
    await verifier(page, (route) => route.fulfill({ json: { success: true }, headers: cors }), sdkCode.replace("Promise.resolve('fixture-token-' + window.__captchaActions.length)", "new Promise(() => {})"));
    await open(page, "?captcha=both");
    await page.clock.install();
    const initial = await sentCount(request);
    const input = await submit(page, "A timed out question");
    await page.waitForFunction(() => (window as unknown as { __captchaActions?: string[] }).__captchaActions?.length === 1);
    await page.clock.fastForward(10001);
    await expect(page.getByRole("alert")).toHaveText(failure);
    await expect(input).toHaveValue("A timed out question");
    await expect(guestMessage(page, "A timed out question")).toHaveCount(0);
    expect(await sentCount(request)).toBe(initial);
});

for (const action of ["restart", "disconnect", "unmount"] as const) {
    test(`a late verification result after ${action} cannot send`, async ({ page, request }) => {
        let finish: (() => void) | undefined;
        const gate = new Promise<void>((resolve) => { finish = resolve; });
        let received = false;
        let responseFinished = false;
        await verifier(page, async (route) => {
            received = true;
            await gate;
            await route.fulfill({ json: { success: true }, headers: cors }).catch(() => {});
            responseFinished = true;
        });
        await open(page, "?captcha=both&unmount=yes");
        const initial = await sentCount(request);
        const input = await submit(page, "Never send this stale question");
        await expect.poll(() => received).toBe(true);
        const bubble = guestMessage(page, "Never send this stale question");
        await expect(bubble.getByText("Verifying…", { exact: true })).toBeVisible();
        if (action === "restart") {
            await page.getByRole("button", { name: "Restart chat", exact: true }).click();
            await page.getByRole("button", { name: "Start new chat", exact: true }).click();
            await expect(input).toHaveValue("");
        } else if (action === "disconnect") {
            await request.post("http://127.0.0.1:4181/disconnect");
            await expect(page.getByRole("alert")).toHaveText(failure);
            await expect(input).toHaveValue("Never send this stale question");
        } else {
            await page.getByRole("button", { name: "Unmount chat", exact: true }).click();
            await expect(page.locator(".ubiq-chat")).toHaveCount(0);
        }
        await expect(bubble).toHaveCount(0);
        finish!();
        await expect.poll(() => responseFinished).toBe(true);
        if (action !== "unmount") await expect(page.getByText("Ready to help with your stay", { exact: true })).toBeVisible();
        expect(await sentCount(request)).toBe(initial);
        await expect(page.getByRole("table")).toHaveCount(0);
    });
}

test("a cold SDK load waits until ready before execute becomes available", async ({ page, request }) => {
    const tokens: string[] = [];
    await verifier(page, async (route) => {
        tokens.push(route.request().postDataJSON().token);
        await route.fulfill({ json: { success: true }, headers: cors });
    }, `window.grecaptcha = { ready: callback => {
        setTimeout(() => {
            window.grecaptcha.execute = () => Promise.resolve('ready-token');
            callback();
        }, 100);
    }};`);
    await open(page, "?captcha=both");
    const initial = await sentCount(request);
    await submit(page, "First question after a cold load");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(tokens).toEqual(["ready-token"]);
    expect(await sentCount(request)).toBe(initial + 1);
});
