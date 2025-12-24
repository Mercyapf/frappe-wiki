# Copyright (c) 2023, Frappe and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.rate_limiter import rate_limit
from frappe.utils import validate_email_address


class WikiFeedback(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		email_id: DF.Data | None
		feedback: DF.SmallText | None
		rating: DF.Rating
		status: DF.Literal["Open", "Closed"]
		type: DF.Literal["Good", "Bad", "Ok"]
		wiki_document: DF.Link
		wiki_page: DF.Link | None
	# end: auto-generated types

	pass


def get_feedback_limit():
	wiki_settings = frappe.get_single("Wiki Settings")
	return wiki_settings.feedback_submission_limit or 3


@frappe.whitelist(allow_guest=True)
@rate_limit(limit=get_feedback_limit, seconds=60 * 60)
def submit_feedback(name, feedback, rating, email=None, feedback_index=None):
	email = validate_email_address(email)
	doc = frappe.get_doc(
		{
			"doctype": "Wiki Feedback",
			"wiki_page": name,
			"rating": rating,
			"feedback": feedback,
			"email_id": email,
		}
	)
	doc.insert()
	return 1
