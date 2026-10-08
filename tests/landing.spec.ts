import { expect, test } from "@playwright/test";

const landingPath = "/tests/fixtures/landing.html";

test("guests can explore the hotel and open configured booking without leaving the page", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(landingPath);
    await expect(page.getByRole("heading", { level: 1, name: "A little calm. A little closer." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open chat", exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("landing-desktop.png"), fullPage: true });

    const navigation = page.getByRole("navigation", { name: "Main navigation" });
    for (const [label, section] of [["Rooms", "rooms"], ["Amenities", "comforts"], ["Neighbourhood", "neighbourhood"]]) {
        await navigation.getByRole("link", { name: label, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`#${section}$`));
        await expect(page.locator(`#${section}`)).toBeInViewport();
    }
    await page.goto(landingPath);
    const bookingPromise = page.waitForEvent("popup");
    await page.getByRole("link", { name: "Check availability", exact: true }).first().click();
    const booking = await bookingPromise;
    await expect(booking.getByRole("heading", { name: "Book a room", exact: true })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${landingPath}$`));
    await expect(page.getByRole("button", { name: "Open chat", exact: true })).toBeVisible();
    await booking.close();
});

test("landing concierge actions reuse the widget and preserve a draft when activated again", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(landingPath);
    const concierge = page.getByRole("button", { name: "Ask the concierge", exact: true }).first();
    await concierge.click();
    const panel = page.getByRole("region", { name: "Bay Hotel Singapore", exact: true });
    await expect(panel).toBeVisible();
    const composer = panel.getByRole("textbox", { name: "Message", exact: true });
    await expect(composer).toBeEnabled();
    await composer.fill("A quiet room for two");
    await concierge.click();
    await expect(panel).toBeVisible();
    await expect(composer).toHaveValue("A quiet room for two");
    await expect(page.locator(".ubiq-chat")).toHaveCount(1);
    await panel.getByRole("button", { name: "Close chat", exact: true }).click();
    await expect(page.getByRole("button", { name: "Open chat", exact: true })).toBeFocused();
    await concierge.click();
    await expect(composer).toHaveValue("A quiet room for two");
});

test("an unconfigured booking link offers help from the concierge", async ({ page }) => {
    await page.goto(`${landingPath}?booking=none`);
    await expect(page.getByRole("link", { name: "Check availability", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Ask about a stay", exact: true }).first().click();
    const panel = page.getByRole("region", { name: "Bay Hotel Singapore", exact: true });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("link", { name: "Book a room", exact: true })).toHaveCount(0);
});

test("the guest page remains usable when the concierge is not configured", async ({ page }) => {
    await page.goto(`${landingPath}?chat=none`);
    await expect(page.getByRole("heading", { level: 1, name: "A little calm. A little closer." })).toBeVisible();
    await expect(page.locator(".ubiq-chat")).toHaveCount(0);
    await expect(page.getByRole("status")).toHaveText("Our online concierge is unavailable right now.");
    await expect(page.getByRole("button", { name: "Ask the concierge", exact: true }).first()).toBeDisabled();
    for (const concierge of await page.getByRole("button", { name: "Ask the concierge", exact: true }).all()) {
        await expect(concierge).toBeDisabled();
    }
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Rooms", exact: true }).click();
    await expect(page.locator("#rooms")).toBeInViewport();
    const bookingPromise = page.waitForEvent("popup");
    await page.getByRole("link", { name: "Check availability", exact: true }).first().click();
    const booking = await bookingPromise;
    await expect(booking.getByRole("heading", { name: "Book a room", exact: true })).toBeVisible();
    await booking.close();
});

test("phone navigation works without horizontal overflow and concierge fills the viewport", async ({ page }, testInfo) => {
    for (const width of [320, 390, 640]) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(landingPath);
        await expect(page.getByRole("heading", { level: 1, name: "A little calm. A little closer." })).toBeVisible();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

        const menu = page.getByRole("button", { name: "Open menu", exact: true });
        await expect(menu).toHaveAttribute("aria-expanded", "false");
        const navigation = page.getByRole("navigation", { name: "Main navigation", includeHidden: true });
        await expect(navigation.getByRole("link", { name: "Rooms", exact: true, includeHidden: true })).toBeHidden();
        await menu.click();
        await expect(page.getByRole("button", { name: "Close menu", exact: true })).toHaveAttribute("aria-expanded", "true");
        await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Rooms", exact: true }).focus();
        await page.keyboard.press("Escape");
        await expect(menu).toHaveAttribute("aria-expanded", "false");
        await expect(menu).toBeFocused();
        await menu.click();
        await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Rooms", exact: true }).click();
        await expect(page).toHaveURL(/#rooms$/);
        await expect(page.locator("#rooms")).toBeInViewport();
        await expect(page.getByRole("button", { name: "Open menu", exact: true })).toHaveAttribute("aria-expanded", "false");

        await page.goto(landingPath);
        if (width === 390) await page.screenshot({ path: testInfo.outputPath("landing-mobile.png"), fullPage: true });
        await page.getByRole("button", { name: "Ask the concierge", exact: true }).first().click();
        const panel = page.getByRole("region", { name: "Bay Hotel Singapore", exact: true });
        await expect.poll(() => panel.boundingBox()).toEqual({ x: 0, y: 0, width, height: 844 });
        await expect(panel.getByRole("button", { name: "Close chat", exact: true })).toBeFocused();
        await panel.getByRole("button", { name: "Close chat", exact: true }).click();
        await expect(page.getByRole("button", { name: "Open chat", exact: true })).toBeFocused();
    }
});
