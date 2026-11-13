import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const statsUrl = "http://127.0.0.1:4181/stats";
const ready = (page: Page) => page.getByText("Ready to help with your stay", { exact: true });
const composer = (page: Page) => page.getByRole("textbox", { name: "Message", exact: true });

type SessionEvent = { type: string; socket: string; x_auth_token: string; input?: string };
async function sessionEvents(request: APIRequestContext) {
    return (await (await request.get(statsUrl)).json()).sessionEvents as SessionEvent[];
}
async function open(page: Page, token: string, query = "") {
    await page.goto(`/tests/fixtures/index.html?session=${token}${query}`);
    await page.getByRole("button", { name: "Open chat", exact: true }).click();
    await expect(ready(page)).toBeVisible();
}
async function dispatch(page: Page, ...events: Array<[string, unknown?]>) {
    await page.evaluate((entries) => {
        for (const [type, detail] of entries) document.dispatchEvent(new CustomEvent(type, { detail }));
    }, events);
}
async function submit(page: Page, message: string) {
    await composer(page).fill(message);
    await composer(page).press("Enter");
}

for (const source of ["qikres", "myroompass"]) {
    test(`${source} login uses the refreshed token and logout opens a clean guest session`, async ({ page, context, request }) => {
        const first = (await sessionEvents(request)).length;
        const initialToken = `fixture-${source}-initial`;
        const freshToken = `fixture-${source}-updated`;
        await open(page, initialToken);
        const other = await context.newPage();
        await open(other, initialToken);
        await submit(page, "Previous conversation");
        await expect(other.getByRole("table")).toBeVisible();
        await dispatch(page, ["qikres/auth", { auth_token: freshToken }], [`${source}/login`]);
        await expect(other.getByText("Previous conversation", { exact: true })).toHaveCount(0);
        await expect(page.getByText("Previous conversation", { exact: true })).toHaveCount(0);
        await expect(ready(page)).toBeVisible();
        await submit(other, "Next booking question");
        await expect(page.getByRole("table")).toBeVisible();
        await composer(page).fill("Private draft");
        await composer(other).fill("Other tab draft");
        await dispatch(page, [`${source}/logout`]);
        await expect(composer(page)).toHaveValue("");
        await expect(composer(other)).toHaveValue("");
        await expect(ready(page)).toBeVisible();
        await expect(ready(other)).toBeVisible();
        await expect(other.getByText("Next booking question", { exact: true })).toHaveCount(0);
        await submit(page, "Guest booking question");
        await expect(other.getByRole("table")).toBeVisible();

        const events = (await sessionEvents(request)).slice(first);
        expect(events.map(({ type, x_auth_token }) => [type, x_auth_token])).toEqual([
            ["authenticate", initialToken], ["chat", initialToken],
            ["authenticate", freshToken], ["login", freshToken], ["chat", freshToken], ["logout", freshToken],
            ["authenticate", ""], ["chat", ""],
        ]);
        expect(events[1].socket).not.toBe(events[2].socket);
        expect(events[5].socket).toBe(events[2].socket);
        expect(events[6].socket).not.toBe(events[5].socket);
        await expect(page.getByText(/Late reply from the signed-in session|Old logout acknowledgement/)).toHaveCount(0);
        await expect.poll(() => page.evaluate(() => localStorage.getItem("chat_history"))).toContain("Guest booking question");
        const cache = await page.evaluate(() => ({
            jwt: JSON.parse(atob(localStorage.getItem("chat_auth_token")!.split(".")[1].replaceAll("-", "+").replaceAll("_", "/"))).data.x_auth_token,
            history: localStorage.getItem("chat_history"),
        }));
        expect(cache.jwt).toBe("");
        expect(cache.history).not.toMatch(/Previous conversation|Next booking question|Late reply/);
    });
}

for (const recover of ["restart", "auth"]) {
    test(`website expiry blocks both tabs and recovers through ${recover}`, async ({ page, context, request }) => {
        const first = (await sessionEvents(request)).length;
        await open(page, "fixture-expiring");
        const other = await context.newPage();
        await open(other, "fixture-expiring");
        await submit(page, "Take your time");
        await expect(page.getByText("Preparing your reply…", { exact: true })).toBeVisible();
        await dispatch(page, ["qikres/sessionExpired"]);
        for (const tab of [page, other]) {
            await expect(composer(tab)).toBeDisabled();
            await expect(tab.getByRole("link", { name: "Yes, restart chat" })).toBeVisible();
        }
        expect(await page.evaluate(() => localStorage.getItem("chat_auth_token"))).toBeNull();
        await dispatch(other, ["qikres/auth", { auth_token: "" }],
            ["qikres/auth", { auth_token: "fixture-expiring" }], ["myroompass/login"]);
        await expect(composer(other)).toBeDisabled();

        if (recover === "restart") {
            await other.getByRole("link", { name: "Yes, restart chat" }).click();
            await other.getByRole("button", { name: "Start new chat" }).click();
        } else {
            await dispatch(other, ["qikres/auth", { auth_token: "fixture-recovered" }], ["qikres/login"]);
        }
        await expect(ready(page)).toBeVisible();
        await expect(ready(other)).toBeVisible();
        await submit(page, "After expiry");
        await expect(other.getByRole("table")).toBeVisible();
        const token = recover === "auth" ? "fixture-recovered" : "";
        expect((await sessionEvents(request)).slice(first).map(({ type, x_auth_token }) => [type, x_auth_token])).toEqual([
            ["authenticate", "fixture-expiring"], ["chat", "fixture-expiring"], ["authenticate", token],
            ...(recover === "auth" ? [["login", token]] : []), ["chat", token],
        ]);
        await expect(page.getByText("Take your time", { exact: true })).toHaveCount(0);
    });
}

test("malformed auth and host events after unmount leave the session alone", async ({ page, context, request }) => {
    const first = (await sessionEvents(request)).length;
    await open(page, "fixture-unmount", "&unmount=yes");
    const other = await context.newPage();
    await open(other, "fixture-unmount");
    await composer(page).fill("Keep this draft");
    await dispatch(page, ["qikres/auth"], ["qikres/auth", {}], ["qikres/auth", { auth_token: 42 }], ["qikres/auth", { auth_token: "fixture-unmount" }]);
    await expect(composer(page)).toHaveValue("Keep this draft");
    await page.getByRole("button", { name: "Unmount chat" }).click();
    await expect(page.locator(".ubiq-chat")).toHaveCount(0);
    await dispatch(page, ["qikres/auth", { auth_token: "fixture-ignored" }], ["qikres/login"], ["myroompass/login"],
        ["qikres/logout"], ["myroompass/logout"], ["qikres/sessionExpired"]);
    await submit(other, "After unmount");
    await expect(other.getByRole("table")).toBeVisible();
    expect((await sessionEvents(request)).slice(first).map(({ type, x_auth_token }) => [type, x_auth_token])).toEqual([
        ["authenticate", "fixture-unmount"], ["chat", "fixture-unmount"],
    ]);
});
