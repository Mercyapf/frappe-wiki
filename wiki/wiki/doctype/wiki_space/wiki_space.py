# Copyright (c) 2023, Frappe and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document


class WikiSpace(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF
		from frappe.website.doctype.top_bar_item.top_bar_item import TopBarItem

		from wiki.wiki.doctype.wiki_group_item.wiki_group_item import WikiGroupItem

		app_switcher_logo: DF.AttachImage | None
		dark_mode_logo: DF.AttachImage | None
		enable_feedback_collection: DF.Check
		favicon: DF.AttachImage | None
		is_published: DF.Check
		light_mode_logo: DF.AttachImage | None
		navbar_items: DF.Table[TopBarItem]
		root_group: DF.Link | None
		route: DF.Data
		show_in_switcher: DF.Check
		space_name: DF.Data | None
		switcher_order: DF.Int
		wiki_sidebars: DF.Table[WikiGroupItem]
	# end: auto-generated types

	def before_insert(self):
		self.create_root_group()

	def validate(self):
		self.remove_leading_slash_from_route()

	def remove_leading_slash_from_route(self):
		if self.route and self.route.startswith("/"):
			self.route = self.route[1 : len(self.route)]

	def create_root_group(self):
		if not self.root_group:
			root_group = frappe.get_doc(
				{
					"doctype": "Wiki Document",
					"title": f"{self.space_name} [Root Group]",
					"route": f"/{self.route}",
					"is_group": 1,
					"published": 0,
					"content": "[root_group]",
				}
			)
			root_group.insert()
			self.root_group = root_group.name

	@frappe.whitelist()
	def migrate_to_v3(self):
		if self.root_group:
			return  # Migration already done

		self.create_root_group()
		self.save()

		sidebar = self.wiki_sidebars
		if not sidebar:
			return

		groups, group_order = self._group_sidebar_items(sidebar)

		for sort_order, group_label in enumerate(group_order):
			self._create_group_with_pages(group_label, groups[group_label], sort_order)

		self.save()

	def _group_sidebar_items(self, sidebar):
		"""Group sidebar items by parent_label while maintaining order"""
		groups = {}
		group_order = []
		for item in sorted(sidebar, key=lambda x: x.idx):
			if item.parent_label not in groups:
				groups[item.parent_label] = []
				group_order.append(item.parent_label)
			groups[item.parent_label].append(item)
		return groups, group_order

	def _create_group_with_pages(self, group_label, items, sort_order):
		"""Create a group Wiki Document and its child page documents"""
		group_doc = frappe.get_doc(
			{
				"doctype": "Wiki Document",
				"title": group_label,
				"route": f"{self.route}/{frappe.scrub(group_label).replace('_', '-')}",
				"is_group": 1,
				"is_published": 1,
				"content": "",
				"parent_wiki_document": self.root_group,
				"sort_order": sort_order,
			}
		)
		group_doc.insert(ignore_permissions=True)

		for page_sort_order, item in enumerate(items):
			self._create_page_document(item.wiki_page, group_doc.name, page_sort_order)

	def _create_page_document(self, wiki_page_name, parent_group, sort_order):
		"""Create a leaf Wiki Document from a Wiki Page"""
		wiki_page = frappe.get_cached_doc("Wiki Page", wiki_page_name)
		leaf_doc = frappe.get_doc(
			{
				"doctype": "Wiki Document",
				"title": wiki_page.title,
				"route": wiki_page.route,
				"is_group": 0,
				"is_published": wiki_page.published,
				"is_private": not wiki_page.allow_guest,
				"content": wiki_page.content,
				"parent_wiki_document": parent_group,
				"sort_order": sort_order,
			}
		)
		leaf_doc.insert(ignore_permissions=True)

	@frappe.whitelist()
	def update_routes(self, new_route: str) -> dict:
		"""Update Wiki Space route and all Wiki Documents under it."""
		frappe.only_for("Wiki Manager")

		from frappe.utils.nestedset import get_descendants_of

		new_route = new_route.strip().strip("/")

		if not new_route:
			frappe.throw("Route cannot be empty")

		old_route = self.route
		if old_route == new_route:
			frappe.throw("New route is the same as current route")

		if not self.root_group:
			frappe.throw("This Wiki Space has no root group. Migrate to Version 3 first.")

		# Check for conflicts
		existing = frappe.db.get_value("Wiki Space", {"route": new_route, "name": ("!=", self.name)})
		if existing:
			frappe.throw(f"Route '{new_route}' is already used by another Wiki Space")

		# Get all documents under this space
		descendants = get_descendants_of("Wiki Document", self.root_group, ignore_permissions=True)
		all_docs = [self.root_group, *list(descendants)]

		# Batch update document routes
		updated_count = self._batch_update_document_routes(all_docs, old_route, new_route)

		# Update space route
		self.route = new_route
		self.save()

		return {"updated_count": updated_count}

	def _batch_update_document_routes(self, doc_names: list, old_route: str, new_route: str) -> int:
		"""Batch update routes using SQL REPLACE."""
		if not doc_names:
			return 0

		placeholders = ", ".join(["%s"] * len(doc_names))

		# Wiki Document strips leading slashes in validate, so routes are always without leading slash
		# Handle two cases:
		# 1. Exact match (root group): old_route -> new_route
		# 2. Prefix match (children): old_route/... -> new_route/...
		frappe.db.sql(
			f"""
			UPDATE `tabWiki Document`
			SET route = CASE
				WHEN route = %s THEN %s
				WHEN route LIKE %s THEN CONCAT(%s, SUBSTRING(route, %s))
				ELSE route
			END,
			modified = NOW(),
			modified_by = %s
			WHERE name IN ({placeholders})
			""",
			(
				old_route,  # exact match old route (root group)
				new_route,  # replace with new route
				f"{old_route}/%",  # starts with old route (children)
				new_route,  # new prefix
				len(old_route) + 1,  # substring position after old_route
				frappe.session.user,
				*doc_names,
			),
		)

		return len(doc_names)
