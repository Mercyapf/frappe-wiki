import { expect, test } from '@playwright/test';
import { callMethod, getList } from '../helpers/frappe';

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

	test('should merge multiple change requests with added folders and pages', async ({
		page,
		request,
	}) => {
		await page.goto('/wiki/spaces');
		await page.waitForLoadState('networkidle');

		// Create a new space
		await page.getByRole('button', { name: 'New Space' }).click();
		await page.waitForSelector('[role="dialog"]', { state: 'visible' });

		const timestamp = Date.now();
		const spaceName = `CR Multi Space ${timestamp}`;
		const spaceRoute = `cr-multi-space-${timestamp}`;

		await page.getByLabel('Space Name').fill(spaceName);
		await page.getByLabel('Route').fill(spaceRoute);
		await page
			.getByRole('dialog')
			.getByRole('button', { name: 'Create' })
			.click();
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/wiki\/spaces\//);

		const spaceUrl = page.url();
		const spaceId = spaceUrl.split('/wiki/spaces/')[1];

		const createGroup = async (title: string) => {
			await page.locator('button[title="New Group"]').click();
			await page.getByRole('dialog').getByLabel('Title').fill(title);
			await page
				.getByRole('dialog')
				.getByRole('button', { name: 'Save Draft' })
				.click();
			await page.waitForSelector(`aside >> text=${title}`, {
				timeout: 10000,
			});
		};

		const addPageToGroup = async (groupTitle: string, pageTitle: string) => {
			const groupItem = page
				.locator('aside .draggable-item', { hasText: groupTitle })
				.first();
			await groupItem.hover();
			await groupItem.locator('button').last().click();
			await page.getByText('Add Page', { exact: true }).click();
			await page.getByRole('dialog').getByLabel('Title').fill(pageTitle);
			await page
				.getByRole('dialog')
				.getByRole('button', { name: 'Save Draft' })
				.click();
			const pageEntry = page
				.locator('aside')
				.getByText(pageTitle, { exact: true });
			await pageEntry.waitFor({ state: 'attached', timeout: 10000 });
			if (!(await pageEntry.isVisible())) {
				await page
					.locator('aside')
					.getByText(groupTitle, { exact: true })
					.click();
			}
			await expect(pageEntry).toBeVisible({ timeout: 10000 });
		};

		const submitChangeRequestForPage = async (
			pageTitle: string,
			groupTitle: string,
		) => {
			const pageEntry = page
				.locator('aside')
				.getByText(pageTitle, { exact: true });
			if (!(await pageEntry.isVisible())) {
				await page
					.locator('aside')
					.getByText(groupTitle, { exact: true })
					.click();
			}
			await pageEntry.click();
			await page.waitForURL(/\/draft\//);
			await page.getByRole('button', { name: 'Submit for Review' }).click();
			await page.getByRole('button', { name: 'Submit' }).click();
			await expect(page).toHaveURL(/\/wiki\/change-requests\//, {
				timeout: 10000,
			});
			return page.url();
		};

		const mergeChangeRequest = async (url: string) => {
			await page.goto(url);
			await page.getByRole('button', { name: 'Merge' }).click();
			await expect(
				page.locator('text=Change request merged').first(),
			).toBeVisible({ timeout: 15000 });
		};

		// Change request 1
		const cr1GroupA = `CR1 Folder A ${timestamp}`;
		const cr1GroupB = `CR1 Folder B ${timestamp}`;
		const cr1Page = `CR1 Page ${timestamp}`;

		await createGroup(cr1GroupA);
		await createGroup(cr1GroupB);
		await addPageToGroup(cr1GroupA, cr1Page);

		const cr1Url = await submitChangeRequestForPage(cr1Page, cr1GroupA);

		// Change request 2 (created after CR1 is submitted)
		await page.goto('/wiki/spaces');
		await page.waitForLoadState('networkidle');
		await page.getByText(spaceName, { exact: true }).click();
		await page.waitForLoadState('networkidle');

		const cr2GroupA = `CR2 Folder A ${timestamp}`;
		const cr2GroupB = `CR2 Folder B ${timestamp}`;
		const cr2Page = `CR2 Page ${timestamp}`;

		await createGroup(cr2GroupA);
		await createGroup(cr2GroupB);
		await addPageToGroup(cr2GroupA, cr2Page);

		const cr2Url = await submitChangeRequestForPage(cr2Page, cr2GroupA);

		// Merge both change requests
		await mergeChangeRequest(cr1Url);
		await mergeChangeRequest(cr2Url);

		// Verify merged tree contains all folders and pages
		type TreeNode = {
			title?: string;
			children?: TreeNode[];
		};

		const tree = await callMethod<{ children: TreeNode[] }>(
			request,
			'wiki.api.wiki_space.get_wiki_tree',
			{ space_id: spaceId },
		);

		const titles = new Set<string>();
		const collectTitles = (nodes: TreeNode[] = []) => {
			for (const node of nodes) {
				if (node?.title) titles.add(node.title);
				if (node?.children?.length) collectTitles(node.children);
			}
		};
		collectTitles(tree?.children || []);

		const expectedTitles = [
			cr1GroupA,
			cr1GroupB,
			cr1Page,
			cr2GroupA,
			cr2GroupB,
			cr2Page,
		];

		for (const title of expectedTitles) {
			expect(titles.has(title)).toBeTruthy();
		}
	});
});
