from pipelines.courtlistener_attorneys import _extract_from_contact_block


def test_extract_firm_skips_phone_and_address_lines():
    contact = """(202) 386-6910
Fax: (202) 232-5513
Motley Rice, LLC
401 9th St. NW
Suite 630
Washington, DC 20004
"""
    assert _extract_from_contact_block(contact, "firm") == "Motley Rice, LLC"


def test_extract_firm_prefers_legal_entity_suffix():
    contact = """Main Contact
The Lanier Law Firm
100 Congress Ave
Austin, TX 78701
"""
    assert _extract_from_contact_block(contact, "firm") == "The Lanier Law Firm"


def test_extract_firm_skips_suite_and_city_state_zip():
    contact = """Phone: 312-555-1212
Suite 400
Chicago, IL 60601
Beasley Allen
"""
    assert _extract_from_contact_block(contact, "firm") == "Beasley Allen"


def test_extract_firm_falls_back_to_first_remaining_non_address_line():
    contact = """(555) 111-2222
123 Main Street
Dallas, TX 75201
Trial Counsel Team
Floor 5
"""
    assert _extract_from_contact_block(contact, "firm") == "Trial Counsel Team"


def test_extract_firm_returns_none_when_no_candidate_lines():
    contact = """(555) 111-2222
Fax: (555) 333-4444
123 Main St
Suite 200
Los Angeles, CA 90017
"""
    assert _extract_from_contact_block(contact, "firm") is None
