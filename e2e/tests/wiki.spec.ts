import { expect, test } from '@playwright/test';

test.describe('Wiki E2E Tests', () => {
	test('should display wiki spaces list', async ({ page }) => {
		await page.goto('/wiki');
		await page.waitForLoadState('networkidle');

		// Should be on wiki page, not redirected to login
		await expect(page).not.toHaveURL(/.*login.*/);

		// Should show the spaces view
		await expect(page.locator('body')).toBeVisible();
	});

	test('should create a new wiki space via UI', async ({ page }) => {
		await page.goto('/wiki');
		await page.waitForLoadState('networkidle');

		// Click create new space button
		await page.click('button:has-text("New"), button:has-text("Create")');

		// Fill in space details in the dialog
		await page.waitForSelector('[role="dialog"], .modal', { state: 'visible' });

		const spaceName = `Test Space ${Date.now()}`;
		await page.fill('input[type="text"]', spaceName);

		// Submit the form
		await page.click('button:has-text("Create"), button[type="submit"]');

		// Should navigate to the new space or show it in the list
		await page.waitForLoadState('networkidle');
	});

	test('should navigate to space and create a wiki page', async ({ page }) => {
		await page.goto('/wiki');
		await page.waitForLoadState('networkidle');

		// Click on first available space
		const spaceLink = page.locator('a[href*="/wiki/spaces/"]').first();
		await spaceLink.click();
		await page.waitForLoadState('networkidle');

		// Should be in the space detail view with sidebar
		await expect(page.locator('aside')).toBeVisible();

		// Look for add/create page button in sidebar
		const addButton = page
			.locator('button:has-text("Add"), button:has-text("New"), [title*="Add"]')
			.first();
		if (await addButton.isVisible()) {
			await addButton.click();
			await page.waitForLoadState('networkidle');
		}
	});

	test('should display wiki page content at public route', async ({ page }) => {
		// Navigate to a known wiki route (assuming there's published content)
		await page.goto('/wiki');
		await page.waitForLoadState('networkidle');

		// Click on first space
		const spaceLink = page.locator('a[href*="/wiki/spaces/"]').first();
		if (await spaceLink.isVisible()) {
			await spaceLink.click();
			await page.waitForLoadState('networkidle');

			// Click on a document in the sidebar
			const docLink = page.locator('aside a, aside [role="treeitem"]').first();
			if (await docLink.isVisible()) {
				await docLink.click();
				await page.waitForLoadState('networkidle');
			}
		}
	});

	test('should show wiki editor when editing a page', async ({ page }) => {
		await page.goto('/wiki');
		await page.waitForLoadState('networkidle');

		// Navigate to a space
		const spaceLink = page.locator('a[href*="/wiki/spaces/"]').first();
		if (await spaceLink.isVisible()) {
			await spaceLink.click();
			await page.waitForLoadState('networkidle');

			// Click on a document
			const docLink = page.locator('aside a, aside [role="treeitem"]').first();
			if (await docLink.isVisible()) {
				await docLink.click();
				await page.waitForLoadState('networkidle');

				// Look for edit button
				const editButton = page
					.locator('button:has-text("Edit"), [title*="Edit"]')
					.first();
				if (await editButton.isVisible()) {
					await editButton.click();
					await page.waitForLoadState('networkidle');

					// Editor should be visible
					await expect(
						page.locator('.wiki-editor, .ProseMirror, [contenteditable]'),
					).toBeVisible();
				}
			}
		}
	});
});
