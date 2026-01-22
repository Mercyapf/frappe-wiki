import { expect, test } from '@playwright/test';
import { getList } from '../helpers/frappe';

interface WikiDocumentRoute {
	route: string;
	doc_key: string;
}

test.describe('Change Request Flow', () => {
	test('should add a page, edit existing page, merge, and verify live content', async ({
		page,
		request,
	}) => {
		await page.goto('/wiki/spaces');
		await page.waitForLoadState('networkidle');

		// Create a new space
		await page.getByRole('button', { name: 'New Space' }).click();
		await page.waitForSelector('[role="dialog"]', { state: 'visible' });

		const timestamp = Date.now();
		const spaceName = `CR Flow Space ${timestamp}`;
		const spaceRoute = `cr-flow-space-${timestamp}`;
		const pageTitle = `cr-flow-page-${timestamp}`;
		const initialContent = `Initial content ${timestamp}`;
		const updatedContent = `Updated content ${timestamp}`;

		await page.getByLabel('Space Name').fill(spaceName);
		const routeInput = page.getByLabel('Route');
		await routeInput.fill(spaceRoute);
		await page
			.getByRole('dialog')
			.getByRole('button', { name: 'Create' })
			.click();
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/wiki\/spaces\//);

		const spaceUrl = page.url();

		// Create a new page draft
		const createFirstPage = page.getByRole('button', {
			name: 'Create First Page',
		});
		const newPageButton = page.getByRole('button', { name: 'New Page' });

		if (await createFirstPage.isVisible({ timeout: 2000 }).catch(() => false)) {
			await createFirstPage.click();
		} else {
			await newPageButton.click();
		}

		await page.getByLabel('Title').fill(pageTitle);
		await page
			.getByRole('dialog')
			.getByRole('button', { name: 'Save Draft' })
			.click();
		await page.waitForTimeout(500);

		// Open the new draft page from the tree
		await page.locator('aside').getByText(pageTitle, { exact: true }).click();
		await page.waitForURL(/\/draft\/[^/?#]+/);
		const draftMatch = page.url().match(/\/draft\/([^/?#]+)/);
		expect(draftMatch).toBeTruthy();
		const docKey = decodeURIComponent(draftMatch?.[1] ?? '');
		const editor = page
			.locator('.ProseMirror, [contenteditable="true"]')
			.first();
		await expect(editor).toBeVisible({ timeout: 10000 });

		await page.waitForFunction(() => window.wikiEditor !== undefined, {
			timeout: 10000,
		});
		await page.evaluate((content) => {
			window.wikiEditor.commands.setContent(content, {
				contentType: 'markdown',
			});
		}, initialContent);
		await editor.click();
		await page.getByRole('button', { name: 'Save Draft' }).click();
		await page.waitForTimeout(500);

		// Submit for review and merge
		await page.getByRole('button', { name: 'Submit for Review' }).click();
		await page.getByRole('button', { name: 'Submit' }).click();
		await expect(page).toHaveURL(/\/wiki\/change-requests\//, {
			timeout: 10000,
		});

		await page.getByRole('button', { name: 'Merge' }).click();
		await expect(
			page.locator('text=Change request merged').first(),
		).toBeVisible({ timeout: 15000 });

		// Verify merged content on live route
		const routes = await getList<WikiDocumentRoute>(request, 'Wiki Document', {
			fields: ['route', 'doc_key'],
			filters: { doc_key: docKey },
			limit: 1,
		});
		expect(routes.length).toBe(1);
		const publicRoute = routes[0].route;
		await page.goto(`/${publicRoute}`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByText(initialContent)).toBeVisible({
			timeout: 10000,
		});

		// Start a new CR by editing the existing page
		await page.goto(spaceUrl);
		await page.waitForLoadState('networkidle');
		await page.locator('aside').getByText(pageTitle, { exact: true }).click();
		await expect(editor).toBeVisible({ timeout: 10000 });

		await page.waitForFunction(() => window.wikiEditor !== undefined, {
			timeout: 10000,
		});
		await page.evaluate((content) => {
			window.wikiEditor.commands.setContent(content, {
				contentType: 'markdown',
			});
		}, `${initialContent}\n\n${updatedContent}`);
		await editor.click();
		await page.getByRole('button', { name: 'Save Draft' }).click();
		await page.waitForTimeout(500);

		await page.getByRole('button', { name: 'Submit for Review' }).click();
		await page.getByRole('button', { name: 'Submit' }).click();
		await expect(page).toHaveURL(/\/wiki\/change-requests\//, {
			timeout: 10000,
		});

		await page.getByRole('button', { name: 'Merge' }).click();
		await expect(
			page.locator('text=Change request merged').first(),
		).toBeVisible({ timeout: 15000 });

		// Verify updated content on live route
		const updatedRoutes = await getList<WikiDocumentRoute>(
			request,
			'Wiki Document',
			{
				fields: ['route', 'doc_key'],
				filters: { doc_key: docKey },
				limit: 1,
			},
		);
		expect(updatedRoutes.length).toBe(1);
		const updatedRoute = updatedRoutes[0].route;
		await page.goto(`/${updatedRoute}`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByText(updatedContent)).toBeVisible({
			timeout: 10000,
		});
	});
});
