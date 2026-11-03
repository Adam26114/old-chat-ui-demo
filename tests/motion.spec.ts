import { expect, test, type Page } from "@playwright/test";

async function ready(page: Page, landing = false) {
    await page.goto(landing ? "/tests/fixtures/landing.html" : "/tests/fixtures/index.html");
    await expect(page.getByText("Ready to help with your stay", { exact: true })).toBeAttached();
}

async function opened(page: Page) {
    const panel = page.locator(".chat-panel");
    await expect(panel).toHaveCSS("opacity", "1");
    await expect(panel).toHaveCSS("transform", "none");
    return panel;
}

test("pointer toggles can reverse a closing panel without losing drafts or focus", async ({ page }) => {
    await ready(page);
    await page.getByRole("button", { name: "Open chat", exact: true }).click();
    const panel = await opened(page);
    const input = page.getByRole("textbox", { name: "Message", exact: true });
    await input.fill("Keep this draft through rapid toggles");
    await page.locator(".chat-launcher").evaluate((launcher) => {
        launcher.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
        launcher.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    });
    await opened(page);
    await expect(input).toHaveValue("Keep this draft through rapid toggles");
    await expect(input).toBeFocused();
    await expect(panel).toHaveJSProperty("inert", false);
    await page.getByRole("button", { name: "Close chat", exact: true }).dispatchEvent("click", { detail: 1 });
    expect(await panel.evaluate((element) => element.inert && !element.contains(document.activeElement))).toBe(true);
    await expect(panel).toBeHidden();
    await expect(page.getByRole("button", { name: "Open chat", exact: true })).toBeFocused();
});

test("keyboard activation and Escape settle immediately, including an interrupted entrance", async ({ page }) => {
    await ready(page);
    const launcher = page.locator(".chat-launcher");
    await launcher.focus();
    await launcher.press("Enter");
    expect(await page.locator(".chat-panel").evaluate((element) => [element.hidden, getComputedStyle(element).opacity, getComputedStyle(element).transform])).toEqual([false, "1", "none"]);
    await page.keyboard.press("Escape");
    expect(await page.locator(".chat-panel").evaluate((element) => element.hidden)).toBe(true);
    await expect(launcher).toBeFocused();
    await launcher.dispatchEvent("click", { detail: 1 });
    await page.keyboard.press("Tab");
    await opened(page);
    for (const button of await page.locator(".chat-suggestion").all()) await expect(button).toHaveCSS("opacity", "1");
});

test("landing launchers preserve pointer motion and keyboard immediacy", async ({ page }) => {
    await ready(page, true);
    const concierge = page.getByRole("button", { name: "Ask the concierge", exact: true }).first();
    // Read in the same event turn so the entrance cannot finish before observation.
    const opacity = await concierge.evaluate((button) => {
        button.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
        return getComputedStyle(document.querySelector(".chat-panel")!).opacity;
    });
    expect(Number(opacity)).toBeLessThan(1);
    await opened(page);
    await page.keyboard.press("Escape");
    await concierge.focus();
    await concierge.press("Enter");
    expect(await page.locator(".chat-panel").evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
});

test("new replies enter once; restored and hidden replies remain still", async ({ page }) => {
    await ready(page);
    await page.getByRole("button", { name: "Open chat", exact: true }).click();
    await opened(page);
    // Observe arrival in the committed DOM, independent of network timing.
    await page.evaluate(() => {
        const viewport = document.querySelector(".chat-viewport")!;
        const existing = new Set(viewport.querySelectorAll('[data-message-role="assistant"]'));
        const observer = new MutationObserver(() => {
            const reply = [...viewport.querySelectorAll<HTMLElement>('[data-message-role="assistant"]')].find((row) => !existing.has(row));
            if (!reply) return;
            viewport.setAttribute("data-test-arrival-opacity", getComputedStyle(reply).opacity);
            observer.disconnect();
        });
        observer.observe(viewport, { childList: true, subtree: true });
    });
    await page.getByRole("textbox", { name: "Message", exact: true }).fill("A room for two");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.locator(".chat-viewport")).toHaveAttribute("data-test-arrival-opacity", /\d/);
    expect(Number(await page.locator(".chat-viewport").getAttribute("data-test-arrival-opacity"))).toBeLessThan(1);
    const replies = page.locator('[data-message-role="assistant"]');
    await expect(replies.last()).toHaveCSS("transform", "none");
    await page.keyboard.press("Escape");
    await page.reload();
    await expect(replies.last()).toBeAttached();
    await page.getByRole("button", { name: "Open chat", exact: true }).click();
    await expect(replies.last()).toHaveCSS("opacity", "1");
    await expect(replies.last()).toHaveCSS("transform", "none");
    await opened(page);
    await page.getByRole("textbox", { name: "Message", exact: true }).fill("Take your time");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Thinking…", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(replies.last()).toContainText("Take your time");
    await page.getByRole("button", { name: "Open chat", exact: true }).click();
    await expect(replies.last()).toHaveCSS("transform", "none");
    await expect(replies.last()).toHaveCSS("opacity", "1");
});

test("runtime reduced motion removes movement, stagger, and the typing loop", async ({ page }) => {
    await ready(page);
    await page.locator(".chat-launcher").dispatchEvent("click", { detail: 1 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await opened(page);
    await page.getByRole("textbox", { name: "Message", exact: true }).fill("Take your time");
    await page.keyboard.press("Enter");
    await expect(page.locator(".chat-typing span").first()).toHaveCSS("opacity", "0.55");
    const samples = await page.locator(".chat-typing span").first().evaluate(async (dot) => {
        const values = [];
        for (let frame = 0; frame < 6; frame++) {
            await new Promise(requestAnimationFrame);
            values.push(getComputedStyle(dot).opacity);
        }
        return values;
    });
    expect(new Set(samples).size).toBe(1);
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("Thinking…", { exact: true })).toHaveCount(0);
});

test("mobile fading preserves viewport edges through entry and exit", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await ready(page);
    await page.locator(".chat-launcher").dispatchEvent("click", { detail: 1 });
    const panel = page.locator(".chat-panel");
    const bounds = await panel.evaluate(async (element) => {
        const frames = [];
        for (let frame = 0; frame < 8; frame++) {
            await new Promise(requestAnimationFrame);
            const box = element.getBoundingClientRect();
            frames.push([box.x, box.y, box.width, box.height, getComputedStyle(element).transform]);
        }
        return frames;
    });
    expect(bounds.every((box) => JSON.stringify(box) === JSON.stringify([0, 0, 390, 844, "none"]) || JSON.stringify(box) === JSON.stringify([0, 0, 390, 844, "matrix(1, 0, 0, 1, 0, 0)"]))).toBe(true);
    await opened(page);
    await page.getByRole("button", { name: "Close chat", exact: true }).dispatchEvent("click", { detail: 1 });
    await expect(page.locator(".chat-launcher")).toBeHidden();
    await expect(panel).toBeHidden();
    await expect(page.locator(".chat-launcher")).toBeFocused();
});

test("typing pauses in hidden tabs and panels, and prompts never replay after draft changes", async ({ page }) => {
    await ready(page);
    await page.getByRole("button", { name: "Open chat", exact: true }).click();
    await opened(page);
    const input = page.getByRole("textbox", { name: "Message", exact: true });
    await input.fill("An unsent draft");
    await input.clear();
    for (const prompt of await page.locator(".chat-suggestion").all()) {
        expect(await prompt.evaluate((element) => [getComputedStyle(element).opacity, getComputedStyle(element).transform])).toEqual(["1", "none"]);
    }
    await input.fill("Take your time");
    await page.keyboard.press("Enter");
    const dot = page.locator(".chat-typing span").first();
    await expect(dot).toBeVisible();
    await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(dot).toHaveCSS("opacity", "0.55");
    await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
        document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(() => dot.evaluate((element) => element.style.opacity)).not.toBe("");
    await page.keyboard.press("Escape");
    await expect(dot).toHaveCSS("opacity", "0.55");
});

test("enabling reduced motion cancels held and releasing button scales", async ({ page }) => {
    await ready(page);
    const launcher = page.locator(".chat-launcher");
    await launcher.dispatchEvent("pointerdown", { pointerId: 1, pointerType: "mouse" });
    await expect.poll(() => launcher.evaluate((element) => getComputedStyle(element).transform)).not.toBe("none");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(launcher).toHaveCSS("transform", "none");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    // WebKit delivers matchMedia changes on its rendering cycle.
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await launcher.dispatchEvent("pointerdown", { pointerId: 1, pointerType: "mouse" });
    await expect.poll(() => launcher.evaluate((element) => getComputedStyle(element).transform)).not.toBe("none");
    await launcher.dispatchEvent("pointerup", { pointerId: 1, pointerType: "mouse" });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(launcher).toHaveCSS("transform", "none");
});
