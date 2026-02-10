# import frappe
# from frappe.website.utils import get_html_content_based_on_context
# from frappe.utils.pdf import get_pdf


# @frappe.whitelist(allow_guest=True)
# def get_context(context):
#     wiki = frappe.form_dict.get("wiki")
#     if not wiki:
#         frappe.throw("Wiki not specified")

#     pages = frappe.get_all(
#         "Wiki Page",
#         filters={"wiki": wiki},
#         fields=["name"],
#         order_by="idx asc"
#     )

#     if not pages:
#         frappe.throw("No pages found")

#     full_html = ""

#     for page in pages:
#         doc = frappe.get_doc("Wiki Page", page.name)
#         html = frappe.render_template(
#             "wiki/wiki/doctype/wiki_page/templates/wiki_page.html",
#             {"doc": doc}
#         )
#         full_html += html + "<div style='page-break-after: always'></div>"

#     pdf = get_pdf(full_html)

#     frappe.local.response.filename = f"{wiki}.pdf"
#     frappe.local.response.filecontent = pdf
#     frappe.local.response.type = "download"


import frappe
from frappe.utils.pdf import get_pdf
from frappe import _

@frappe.whitelist(allow_guest=True)
def get_context(context):
    wiki = frappe.form_dict.get("wiki")
    if not wiki:
        frappe.throw(_("Wiki space not provided"))

    # Get all published wiki pages under this space
    pages = frappe.get_all(
        "Wiki Page",
        filters={
            "route": ["like", f"{wiki}/%"],
            "published": 1,
        },
        fields=["name", "title", "route"],
        order_by="idx asc",
    )

    html = ""
    for p in pages:
        doc = frappe.get_doc("Wiki Page", p.name)
        html += f"<h1>{doc.title}</h1>"
        html += doc.content or ""
        html += "<hr>"

    pdf = get_pdf(html)

    frappe.local.response.filename = f"{wiki}.pdf"
    frappe.local.response.filecontent = pdf
    frappe.local.response.type = "pdf"
