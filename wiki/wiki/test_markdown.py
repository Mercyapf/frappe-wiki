# Copyright (c) 2025, Frappe and Contributors
# See license.txt

import unittest

from wiki.wiki.markdown import render_markdown


class TestMarkdownRenderer(unittest.TestCase):
	"""Tests for the custom markdown renderer."""

	def test_basic_markdown(self):
		"""Test basic markdown rendering."""
		result = render_markdown("**bold** and *italic*")
		self.assertIn("<strong>bold</strong>", result)
		self.assertIn("<em>italic</em>", result)

	def test_empty_content(self):
		"""Test empty content returns empty string."""
		self.assertEqual(render_markdown(""), "")
		self.assertEqual(render_markdown(None), "")

	def test_headings(self):
		"""Test heading rendering."""
		result = render_markdown("# Heading 1\n## Heading 2")
		self.assertIn("<h1>Heading 1</h1>", result)
		self.assertIn("<h2>Heading 2</h2>", result)

	def test_links(self):
		"""Test link rendering."""
		result = render_markdown("[Link text](https://example.com)")
		self.assertIn('href="https://example.com"', result)
		self.assertIn("Link text", result)


class TestImageCaptionSupport(unittest.TestCase):
	"""Tests for image caption support in markdown."""

	def test_image_with_caption(self):
		"""Test that images with alt text render with figure and figcaption."""
		result = render_markdown("![This is a caption](/files/test.jpg)")

		# Should have figure wrapper
		self.assertIn('<figure class="wiki-image-figure">', result)
		self.assertIn("</figure>", result)

		# Should have image with alt
		self.assertIn('<img src="/files/test.jpg"', result)
		self.assertIn('alt="This is a caption"', result)

		# Should have figcaption with caption text
		self.assertIn('<figcaption class="wiki-image-caption">This is a caption</figcaption>', result)

	def test_image_without_caption(self):
		"""Test that images without alt text render as simple img tags."""
		result = render_markdown("![](/files/test.jpg)")

		# Should NOT have figure wrapper
		self.assertNotIn("<figure", result)
		self.assertNotIn("<figcaption", result)

		# Should have simple image
		self.assertIn('<img src="/files/test.jpg"', result)

	def test_image_with_title(self):
		"""Test that images with title attribute render correctly."""
		result = render_markdown('![Caption](/files/test.jpg "Image title")')

		# Should have figure wrapper
		self.assertIn('<figure class="wiki-image-figure">', result)

		# Should have image with alt and title
		self.assertIn('alt="Caption"', result)
		self.assertIn('title="Image title"', result)

		# Should have figcaption
		self.assertIn('<figcaption class="wiki-image-caption">Caption</figcaption>', result)

	def test_image_caption_escapes_html(self):
		"""Test that caption text is properly escaped."""
		result = render_markdown("![<script>alert('xss')</script>](/files/test.jpg)")

		# Script tags should be escaped, not rendered as HTML
		self.assertNotIn("<script>alert", result)
		# The escaping is double-encoded due to how mistune processes
		self.assertIn("&amp;lt;script&amp;gt;", result)

	def test_multiple_images_with_captions(self):
		"""Test multiple images in same content."""
		content = """
![First image](/files/first.jpg)

Some text between images.

![Second image](/files/second.jpg)
"""
		result = render_markdown(content)

		# Both images should have figures
		self.assertEqual(result.count('<figure class="wiki-image-figure">'), 2)
		self.assertEqual(result.count("</figure>"), 2)

		# Both should have their captions
		self.assertIn(
			'<figcaption class="wiki-image-caption">First image</figcaption>',
			result,
		)
		self.assertIn(
			'<figcaption class="wiki-image-caption">Second image</figcaption>',
			result,
		)

	def test_image_in_paragraph(self):
		"""Test image within paragraph text."""
		result = render_markdown("Here is an image: ![my image](/files/img.png) in text.")

		# Should still have figure
		self.assertIn('<figure class="wiki-image-figure">', result)
		self.assertIn('<figcaption class="wiki-image-caption">my image</figcaption>', result)


class TestCalloutRendering(unittest.TestCase):
	"""Tests for callout/aside rendering.

	Note: Callouts use a preprocessing step before markdown rendering.
	The callout must start at the beginning of a line in the document.
	"""

	def test_note_callout(self):
		"""Test note callout rendering."""
		# Callout must be at start of document or after blank line
		content = """:::note
This is a note
:::
"""
		result = render_markdown(content)
		self.assertIn("callout-note", result)
		self.assertIn("This is a note", result)

	def test_tip_callout(self):
		"""Test tip callout rendering."""
		content = """:::tip
This is a tip
:::
"""
		result = render_markdown(content)
		self.assertIn("callout-tip", result)

	def test_caution_callout(self):
		"""Test caution callout rendering."""
		content = """:::caution
Be careful
:::
"""
		result = render_markdown(content)
		self.assertIn("callout-caution", result)

	def test_danger_callout(self):
		"""Test danger callout rendering."""
		content = """:::danger
Dangerous!
:::
"""
		result = render_markdown(content)
		self.assertIn("callout-danger", result)

	def test_warning_callout_maps_to_caution(self):
		"""Test warning is alias for caution."""
		content = """:::warning
Warning text
:::
"""
		result = render_markdown(content)
		self.assertIn("callout-caution", result)

	def test_callout_with_custom_title(self):
		"""Test callout with custom title."""
		content = """:::note[Custom Title]
Content
:::
"""
		result = render_markdown(content)
		self.assertIn("Custom Title", result)


class TestTableRendering(unittest.TestCase):
	"""Tests for table rendering."""

	def test_basic_table(self):
		"""Test basic table rendering."""
		content = """
| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |
"""
		result = render_markdown(content)
		self.assertIn("<table>", result)
		self.assertIn("<th>", result)
		self.assertIn("<td>", result)


class TestTaskListRendering(unittest.TestCase):
	"""Tests for task list rendering."""

	def test_task_list(self):
		"""Test task list rendering."""
		content = """
- [ ] Unchecked item
- [x] Checked item
"""
		result = render_markdown(content)
		self.assertIn('type="checkbox"', result)


if __name__ == "__main__":
	unittest.main()
