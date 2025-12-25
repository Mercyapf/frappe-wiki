import frappe
from frappe import _


@frappe.whitelist()
def get_my_contribution_batches() -> list[dict]:
	"""Get all contribution batches owned by the current user."""
	batches = frappe.db.get_all(
		"Wiki Contribution Batch",
		filters={"contributor": frappe.session.user},
		fields=[
			"name",
			"title",
			"wiki_space",
			"status",
			"modified",
			"submitted_at",
		],
		order_by="modified desc",
	)

	# Enrich with wiki space name and contribution count
	for batch in batches:
		batch["wiki_space_name"] = frappe.db.get_value("Wiki Space", batch["wiki_space"], "space_name")
		batch["contribution_count"] = frappe.db.count("Wiki Contribution", {"batch": batch["name"]})

	return batches


@frappe.whitelist()
def get_pending_reviews() -> list[dict]:
	"""Get all contribution batches pending review (for Wiki Managers)."""
	# Check if user is a Wiki Manager
	if not _is_wiki_manager():
		frappe.throw(_("Only Wiki Managers can view pending reviews"))

	batches = frappe.db.get_all(
		"Wiki Contribution Batch",
		filters={"status": ("in", ["Submitted", "Under Review"])},
		fields=[
			"name",
			"title",
			"wiki_space",
			"status",
			"contributor",
			"submitted_at",
		],
		order_by="submitted_at asc",
	)

	# Enrich with additional info
	for batch in batches:
		batch["wiki_space_name"] = frappe.db.get_value("Wiki Space", batch["wiki_space"], "space_name")
		batch["contribution_count"] = frappe.db.count("Wiki Contribution", {"batch": batch["name"]})
		# Get contributor info
		contributor = frappe.db.get_value(
			"User",
			batch["contributor"],
			["full_name", "user_image"],
			as_dict=True,
		)
		if contributor:
			batch["contributor_name"] = contributor.full_name
			batch["contributor_image"] = contributor.user_image

	return batches


@frappe.whitelist()
def approve_contribution_batch(batch_name: str):
	"""Approve a contribution batch and merge the changes."""
	if not _is_wiki_manager():
		frappe.throw(_("Only Wiki Managers can approve contributions"))

	batch = frappe.get_doc("Wiki Contribution Batch", batch_name)

	if batch.status not in ["Submitted", "Under Review"]:
		frappe.throw(_("This contribution cannot be approved in its current state"))

	# First approve the batch
	batch.approve()

	# Then merge the changes
	batch.merge()


@frappe.whitelist()
def reject_contribution_batch(batch_name: str, comment: str):
	"""Reject a contribution batch with feedback."""
	if not _is_wiki_manager():
		frappe.throw(_("Only Wiki Managers can reject contributions"))

	batch = frappe.get_doc("Wiki Contribution Batch", batch_name)

	if batch.status not in ["Submitted", "Under Review"]:
		frappe.throw(_("This contribution cannot be rejected in its current state"))

	batch.status = "Rejected"
	batch.reviewed_by = frappe.session.user
	batch.reviewed_at = frappe.utils.now()
	batch.review_comment = comment
	batch.save()


def _is_wiki_manager() -> bool:
	"""Check if the current user is a Wiki Manager."""
	user_roles = frappe.get_roles(frappe.session.user)
	return "Wiki Manager" in user_roles or "System Manager" in user_roles
