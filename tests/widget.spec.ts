import { expect, test, type Page } from "@playwright/test";

async function openChat(page: Page, query = "") {
    await page.goto(`/tests/fixtures/index.html${query}`);
    await expect(page.getByText("Ready to help with your stay", { exact: true })).toBeAttached();
    await page.getByRole("button", { name: "Open chat", exact: true }).click();
}

test("a reconnecting guest can keep a draft and send after the connection recovers", async ({ page }) => {
    await openChat(page);
    const composer = page.getByRole("textbox", { name: "Message", exact: true });
    await composer.fill("Reconnect briefly");
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(page.getByText("Reconnecting…", { exact: true })).toBeVisible();
    await composer.fill("My next question");
    await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeDisabled();
    await expect(page.getByText("Ready to help with your stay", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(composer).toHaveValue("My next question");
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(page.getByRole("table")).toBeVisible();
});

test("guests can return to the latest message after scrolling through a long answer", async ({ page }) => {
    await openChat(page);
    await page.getByRole("textbox", { name: "Message", exact: true }).fill("Long answer");
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    const lastDetail = page.getByText("The last detail of your stay.", { exact: true });
    await expect(lastDetail).toBeInViewport();
    await page.locator(".chat-viewport").evaluate((viewport) => { viewport.scrollTop = 0; });
    await page.getByRole("button", { name: "Scroll to latest message", exact: true }).click();
    await expect(lastDetail).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Open chat", exact: true })).toBeFocused();
});

test("an empty conversation restarts directly and clears its unsent draft", async ({ page }) => {
    await openChat(page, "?greeting=none");
    const composer = page.getByRole("textbox", { name: "Message", exact: true });
    await composer.fill("An unsent question");
    await page.getByRole("button", { name: "Restart chat", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(composer).toHaveValue("");
    await expect(page.getByRole("heading", { name: "Make yourself at home." })).toBeVisible();
});

test("phone sizing follows dynamic viewport units when visualViewport and resize notifications are unavailable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
        Object.defineProperty(window, "visualViewport", { get: () => null });
        // Model browser-chrome resizing without a window resize notification.
        window.addEventListener("resize", (event) => event.stopImmediatePropagation(), true);
    });
    await openChat(page);
    await page.setViewportSize({ width: 390, height: 450 });
    await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeInViewport();
    await expect.poll(() => page.getByRole("region", { name: "Hotel guest assistant" }).boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 450 });
});

test("starter questions remain after the greeting and can be edited before sending", async ({ page }, testInfo) => {
    await openChat(page);
    await expect(page.getByText("Welcome to", { exact: false })).toBeVisible();
    await page.getByRole("region", { name: "Hotel guest assistant" }).screenshot({ path: testInfo.outputPath("widget-desktop-welcome.png") });
    await page.getByRole("button", { name: "Rooms & reservations", exact: true }).click();
    const composer = page.getByRole("textbox", { name: "Message", exact: true });
    await expect(composer).toHaveValue("Can you help me book a room?");
    await expect(composer).toBeFocused();
    await expect(page.getByText("You asked:", { exact: false })).toHaveCount(0);
    await composer.fill("A deluxe room for two");
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(page.getByText("Thinking…", { exact: true })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("A deluxe room for two", { exact: true })).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Rooms & reservations", exact: true })).toHaveCount(0);
    await page.getByRole("region", { name: "Hotel guest assistant" }).screenshot({ path: testInfo.outputPath("widget-desktop.png") });
});

test("the phone panel uses the screen without focusing the keyboard and preserves drafts when resized", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openChat(page);
    await expect(page.getByRole("button", { name: "Close chat", exact: true })).toBeFocused();
    const panel = page.getByRole("region", { name: "Hotel guest assistant" });
    await expect.poll(() => panel.boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 844 });
    await panel.screenshot({ path: testInfo.outputPath("widget-mobile.png") });
    const composer = page.getByRole("textbox", { name: "Message", exact: true });
    await composer.fill("Keep this question");
    await page.setViewportSize({ width: 390, height: 450 });
    await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeInViewport();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(composer).toHaveValue("Keep this question");
    await page.getByRole("button", { name: "Close chat", exact: true }).click();
    await expect(page.getByRole("button", { name: "Open chat", exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Open chat", exact: true }).click();
    await expect(composer).toHaveValue("Keep this question");
});

test("expired-session links confirm restart and Escape dismisses only the confirmation", async ({ page }) => {
    await openChat(page);
    const composer = page.getByRole("textbox", { name: "Message", exact: true });
    await composer.fill("Expire session");
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(composer).toBeDisabled();
    await page.getByRole("link", { name: "Yes, restart chat" }).click();
    const confirmation = page.getByRole("alertdialog", { name: "Start a new chat?" });
    await expect(confirmation).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(confirmation).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Close chat", exact: true })).toBeVisible();
    await expect(composer).toBeDisabled();
    await page.getByRole("link", { name: "Yes, restart chat" }).click();
    await confirmation.getByRole("button", { name: "Start new chat", exact: true }).click();
    await expect(composer).toBeEnabled();
    await expect(page.getByRole("button", { name: "Hotel amenities", exact: true })).toBeVisible();
});

test("no booking shortcut is invented when a URL is not configured", async ({ page }) => {
    await openChat(page, "?booking=none");
    await expect(page.getByRole("link", { name: "Book a room", exact: true })).toHaveCount(0);
});

test("errors, multiline input, restored history, and host styles remain usable", async ({ page, context, browserName }, testInfo) => {
    await openChat(page);
    await expect(page.getByRole("button", { name: "Hotel page button" })).toHaveCSS("background-color", "rgb(255, 192, 203)");
    await expect(page.getByRole("button", { name: "Restart chat", exact: true })).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    if (browserName === "chromium") {
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        const copyControl = page.getByRole("button", { name: "Copy message", exact: true });
        const message = page.locator('[data-message-role="assistant"]').first();
        await page.mouse.move(0, 0);
        await message.screenshot({ path: testInfo.outputPath("copy-rest.png") });
        await copyControl.hover();
        await expect(copyControl).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
        await message.screenshot({ path: testInfo.outputPath("copy-hover.png") });
        await page.mouse.move(0, 0);
        await page.keyboard.press("Tab");
        await copyControl.focus();
        await message.screenshot({ path: testInfo.outputPath("copy-keyboard-focus.png") });
        await copyControl.click();
        await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("Welcome to");
        await message.screenshot({ path: testInfo.outputPath("copy-copied.png") });
    }
    const composer = page.getByRole("textbox", { name: "Message", exact: true });
    await composer.fill("Show an error");
    await composer.press("Enter");
    await expect(page.getByText("We couldn't answer that question. Please try again.", { exact: true })).toBeVisible();
    await composer.fill("Late arrival");
    await composer.press("Shift+Enter");
    await composer.press("a");
    await expect(composer).toHaveValue("Late arrival\na");
    await composer.press("Enter");
    await expect(page.getByRole("table")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("table", { includeHidden: true })).toBeAttached();
    await page.getByRole("button", { name: "Open chat", exact: true }).click();
    await expect(page.getByRole("table")).toBeVisible();
});

test("small screens keep actions inside the panel and respect reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 320, height: 568 });
    await openChat(page);
    const panel = page.getByRole("region", { name: "Hotel guest assistant" });
    for (const width of [320, 390, 640]) {
        await page.setViewportSize({ width, height: 568 });
        await expect(page.getByRole("button", { name: "Close chat", exact: true })).toBeInViewport();
        await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeInViewport();
        await expect.poll(() => panel.boundingBox()).toEqual({ x: 0, y: 0, width, height: 568 });
    }
    await expect(page.getByRole("button", { name: "Rooms & reservations", exact: true })).toHaveCSS("transition-duration", "0s");
});

test.describe("touch-device landscape", () => {
    test.use({ hasTouch: true, viewport: { width: 844, height: 390 } });

    test("chat fills the phone landscape viewport and restores the launcher on close", async ({ page }, testInfo) => {
        await openChat(page);
        const panel = page.getByRole("region", { name: "Hotel guest assistant" });
        await expect.poll(() => panel.boundingBox()).toEqual({ x: 0, y: 0, width: 844, height: 390 });
        await expect(page.getByRole("button", { name: "Close chat", exact: true })).toBeFocused();
        await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeInViewport();
        await expect(page.getByRole("button", { name: "Hide chat", exact: true })).toHaveCount(0);
        await panel.screenshot({ path: testInfo.outputPath("widget-landscape.png") });
        await page.getByRole("button", { name: "Close chat", exact: true }).click();
        await expect(page.getByRole("button", { name: "Open chat", exact: true })).toBeFocused();
    });
});

test("restart cancellation keeps the conversation and draft, while confirmation clears them", async ({ page }) => {
    await openChat(page);
    const composer = page.getByRole("textbox", { name: "Message", exact: true });
    await composer.fill("A room with a garden view");
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await composer.fill("An unsent question");
    await page.getByRole("button", { name: "Restart chat", exact: true }).click();
    const confirmation = page.getByRole("alertdialog", { name: "Start a new chat?" });
    await expect(confirmation).toBeVisible();
    await expect(confirmation.getByRole("button", { name: "Keep chatting" })).toBeFocused();
    await confirmation.getByRole("button", { name: "Keep chatting" }).click();
    await expect(composer).toHaveValue("An unsent question");
    await expect(page.getByText("A room with a garden view", { exact: true })).toHaveCount(2);
    await page.getByRole("button", { name: "Restart chat", exact: true }).click();
    await confirmation.getByRole("button", { name: "Start new chat", exact: true }).click();
    await expect(composer).toHaveValue("");
    await expect(page.getByText("A room with a garden view", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Welcome to", { exact: false })).toBeVisible();
});

test("the booking shortcut opens the configured page without leaving the chat", async ({ page }) => {
    await openChat(page);
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("link", { name: "Book a room", exact: true }).click();
    const booking = await popupPromise;
    await expect(booking.getByRole("heading", { name: "Book a room" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Message", exact: true })).toBeVisible();
    await booking.close();
});
