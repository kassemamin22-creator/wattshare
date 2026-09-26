import pytest

PRICE_PER_AMPERE = 10.0
AMPERE = 10
FLAT_FEE = AMPERE * PRICE_PER_AMPERE
SUBSCRIPTION_BODY = {
    "ampere": AMPERE,
    "address": "Main Street 1",
    "building": "Block A",
    "phone": "+96170123456",
}
IMAGE_BYTES = b"fake-image-bytes"


@pytest.fixture
def owner(make_user):
    return make_user("owner", name="Omar Manager")


@pytest.fixture
def admin(make_user):
    return make_user("admin", name="Adam Admin")


@pytest.fixture(autouse=True)
def fixed_price(client, admin):
    response = client.put(
        "/admin/tariff", json={"price_per_ampere": PRICE_PER_AMPERE}, headers=admin["headers"]
    )
    assert response.status_code == 200


def activate(client, owner, subscriber):
    """Give the subscriber an approved (active) subscription."""
    created = client.post("/subscription", json=SUBSCRIPTION_BODY, headers=subscriber["headers"])
    assert created.status_code == 200
    approved = client.patch(
        f"/owner/subscriptions/{created.json()['id']}/approve",
        json={"payment_method": "cash"},
        headers=owner["headers"],
    )
    assert approved.status_code == 200
    return approved.json()


@pytest.fixture
def sara(client, make_user, owner):
    user = make_user("subscriber", name="Sara Subscriber")
    activate(client, owner, user)
    return user


@pytest.fixture
def bob(client, make_user, owner):
    user = make_user("subscriber", name="Bob Subscriber")
    activate(client, owner, user)
    return user


def submit_reading(client, manager, subscriber, value):
    return client.post(
        "/meter-reading",
        json={"subscriber_id": subscriber["id"], "reading_value": value},
        headers=manager["headers"],
    )


def expected_amount(main_module, consumption):
    return consumption * main_module.TARIFF_RATE + FLAT_FEE


# ------------------------------------------------- meter readings & billing


def test_first_reading_creates_a_bill_with_the_correct_amount(client, main_module, owner, sara):
    response = submit_reading(client, owner, sara, 150)

    assert response.status_code == 200
    bill = response.json()
    assert bill["subscriber_id"] == sara["id"]
    assert bill["status"] == "pending"
    assert bill["consumption_kwh"] == 150
    assert bill["amount"] == pytest.approx(expected_amount(main_module, 150))


def test_later_reading_bills_only_the_consumption_since_the_previous_one(client, main_module, owner, sara):
    submit_reading(client, owner, sara, 150)

    response = submit_reading(client, owner, sara, 200)

    assert response.status_code == 200
    assert response.json()["consumption_kwh"] == 50
    assert response.json()["amount"] == pytest.approx(expected_amount(main_module, 50))


def test_reading_lower_than_the_previous_one_is_rejected(client, owner, sara):
    submit_reading(client, owner, sara, 150)

    response = submit_reading(client, owner, sara, 100)

    assert response.status_code == 400
    assert "cannot be lower" in response.json()["detail"]


def test_reading_for_a_subscriber_without_a_subscription_fails(client, make_user, owner):
    stranger = make_user("subscriber", name="No Subscription")

    response = submit_reading(client, owner, stranger, 100)

    assert response.status_code == 404
    assert response.json()["detail"] == "Subscriber has no active subscription"


def test_reading_for_a_subscriber_whose_subscription_is_not_active_fails(client, make_user, owner):
    waiting = make_user("subscriber", name="Still Pending")
    client.post("/subscription", json=SUBSCRIPTION_BODY, headers=waiting["headers"])

    response = submit_reading(client, owner, waiting, 100)

    assert response.status_code == 400
    assert "inactive" in response.json()["detail"]


@pytest.mark.parametrize("role", ["subscriber", "admin"])
def test_only_managers_can_submit_meter_readings(client, make_user, sara, role):
    outsider = sara if role == "subscriber" else make_user(role)

    response = submit_reading(client, outsider, sara, 100)

    assert response.status_code == 403


def test_bills_me_returns_only_the_callers_own_bills(client, owner, sara, bob):
    sara_bill = submit_reading(client, owner, sara, 100).json()
    bob_bill = submit_reading(client, owner, bob, 300).json()

    sara_bills = client.get("/bills/me", headers=sara["headers"]).json()
    bob_bills = client.get("/bills/me", headers=bob["headers"]).json()

    assert [bill["id"] for bill in sara_bills] == [sara_bill["id"]]
    assert [bill["id"] for bill in bob_bills] == [bob_bill["id"]]
    assert all(bill["subscriber_id"] == sara["id"] for bill in sara_bills)


@pytest.mark.parametrize("viewer_role", ["admin", "owner"])
def test_admin_and_manager_can_list_all_bills(client, make_user, owner, sara, bob, viewer_role):
    submit_reading(client, owner, sara, 100)
    submit_reading(client, owner, bob, 300)
    viewer = make_user(viewer_role)

    response = client.get("/admin/bills", headers=viewer["headers"])

    assert response.status_code == 200
    bills = response.json()
    assert {bill["subscriber_id"] for bill in bills} == {sara["id"], bob["id"]}
    assert {bill["subscriber_name"] for bill in bills} == {"Sara Subscriber", "Bob Subscriber"}


def test_subscriber_cannot_list_all_bills(client, sara):
    response = client.get("/admin/bills", headers=sara["headers"])

    assert response.status_code == 403


def test_marking_a_bill_paid_updates_its_status_and_the_revenue_totals(client, admin, owner, sara):
    bill = submit_reading(client, owner, sara, 100).json()

    before = client.get("/admin/revenue", headers=admin["headers"]).json()
    assert before["total_collected"] == 0
    assert before["total_outstanding"] == pytest.approx(bill["amount"])
    assert before["paid_count"] == 0

    paid = client.patch(f"/bills/{bill['id']}/mark-paid", headers=admin["headers"])

    assert paid.status_code == 200
    assert paid.json()["status"] == "paid"

    after = client.get("/admin/revenue", headers=admin["headers"]).json()
    assert after["total_collected"] == pytest.approx(bill["amount"])
    assert after["total_outstanding"] == 0
    assert after["paid_count"] == 1
    assert after["outstanding_count"] == 0

    stored = client.get("/bills/me", headers=sara["headers"]).json()
    assert stored[0]["status"] == "paid"


def test_a_subscriber_cannot_mark_their_own_bill_paid(client, owner, sara):
    bill = submit_reading(client, owner, sara, 100).json()

    response = client.patch(f"/bills/{bill['id']}/mark-paid", headers=sara["headers"])

    assert response.status_code == 403
    assert client.get("/bills/me", headers=sara["headers"]).json()[0]["status"] == "pending"


# ------------------------------------------------------------- OCR endpoint


def ocr(client, headers, content_type="image/jpeg"):
    return client.post(
        "/meter-reading/ocr", files={"file": ("meter.jpg", IMAGE_BYTES, content_type)}, headers=headers
    )


@pytest.mark.parametrize(
    "gemini_reply, expected",
    [
        ("4581.6", 4581.6),
        ("004581", 4581.0),
        ("  1234 \n", 1234.0),
        ("NONE", None),
        ("The meter shows about 45", None),
        ("12.3.4", None),
        ("", None),
    ],
)
def test_ocr_parses_gemini_replies(client, fake_gemini, owner, gemini_reply, expected):
    fake_gemini.reply_text = gemini_reply

    response = ocr(client, owner["headers"])

    assert response.status_code == 200
    assert response.json()["reading_value"] == expected
    assert response.json()["raw_text"] == gemini_reply.strip()


def test_ocr_sends_the_uploaded_image_to_gemini(client, main_module, fake_gemini, owner):
    fake_gemini.reply_text = "100"

    ocr(client, owner["headers"], content_type="image/png")

    assert len(fake_gemini.generate_calls) == 1
    call = fake_gemini.generate_calls[0]
    assert call["model"] == main_module.GEMINI_OCR_MODEL
    image_part = call["contents"][0]
    assert image_part.inline_data.data == IMAGE_BYTES
    assert image_part.inline_data.mime_type == "image/png"


@pytest.mark.parametrize("role", ["subscriber", "admin"])
def test_only_managers_can_use_ocr(client, make_user, fake_gemini, role):
    outsider = make_user(role)

    response = ocr(client, outsider["headers"])

    assert response.status_code == 403
    assert fake_gemini.generate_calls == []


def test_ocr_rejects_a_non_image_upload(client, fake_gemini, owner):
    response = ocr(client, owner["headers"], content_type="application/pdf")

    assert response.status_code == 400
    assert fake_gemini.generate_calls == []


def test_ocr_returns_a_clean_error_when_gemini_fails(client, fake_gemini, owner):
    fake_gemini.error = RuntimeError("Gemini is down")

    response = ocr(client, owner["headers"])

    assert response.status_code == 400
    assert "enter it manually" in response.json()["detail"]


# --------------------------------------------------------- chatbot endpoint


def ask(client, headers, message="How much do I owe?", history=None):
    body = {"message": message}
    if history is not None:
        body["history"] = history
    return client.post("/chatbot/ask", json=body, headers=headers)


def make_history(turns):
    return [
        {"role": "user" if index % 2 == 0 else "model", "text": f"turn {index}"} for index in range(turns)
    ]


def sent_history_texts(fake_gemini):
    history = fake_gemini.chat_create_calls[0]["history"]
    return [content.parts[0].text for content in history]


def test_chatbot_returns_the_models_reply(client, fake_gemini, sara):
    fake_gemini.reply_text = "You owe nothing right now."

    response = ask(client, sara["headers"])

    assert response.status_code == 200
    assert response.json() == {"reply": "You owe nothing right now."}
    assert fake_gemini.sent_messages == ["How much do I owe?"]


@pytest.mark.parametrize("role", ["owner", "admin"])
def test_only_subscribers_can_use_the_chatbot(client, make_user, fake_gemini, role):
    outsider = make_user(role)

    response = ask(client, outsider["headers"])

    assert response.status_code == 403
    assert fake_gemini.chat_create_calls == []


def test_chatbot_rejects_a_message_over_1000_characters(client, fake_gemini, sara):
    response = ask(client, sara["headers"], message="x" * 1001)

    assert response.status_code == 400
    assert "too long" in response.json()["detail"]
    assert fake_gemini.chat_create_calls == []


def test_chatbot_accepts_a_message_of_exactly_1000_characters(client, fake_gemini, sara):
    response = ask(client, sara["headers"], message="x" * 1000)

    assert response.status_code == 200
    assert fake_gemini.sent_messages == ["x" * 1000]


def test_chatbot_trims_history_to_the_last_20_turns(client, fake_gemini, sara):
    response = ask(client, sara["headers"], history=make_history(30))

    assert response.status_code == 200
    assert sent_history_texts(fake_gemini) == [f"turn {index}" for index in range(10, 30)]


def test_chatbot_drops_a_leading_model_turn_left_by_trimming(client, fake_gemini, sara):
    # 21 turns: the last 20 start at index 1, a "model" turn, which Gemini would reject as a first turn.
    response = ask(client, sara["headers"], history=make_history(21))

    assert response.status_code == 200
    assert sent_history_texts(fake_gemini) == [f"turn {index}" for index in range(2, 21)]


def test_chatbot_leaves_short_history_untouched(client, fake_gemini, sara):
    ask(client, sara["headers"], history=make_history(4))

    assert sent_history_texts(fake_gemini) == ["turn 0", "turn 1", "turn 2", "turn 3"]


def test_chatbot_context_contains_only_the_callers_own_data(client, fake_gemini, owner, sara, bob):
    submit_reading(client, owner, sara, 111)
    submit_reading(client, owner, bob, 999)

    ask(client, sara["headers"])

    system_instruction = fake_gemini.chat_create_calls[0]["config"].system_instruction
    assert "Sara Subscriber" in system_instruction
    assert "111.0 kWh" in system_instruction or "111 kWh" in system_instruction
    assert "Bob Subscriber" not in system_instruction
    assert "999" not in system_instruction


def test_chatbot_returns_a_clean_error_when_gemini_fails(client, fake_gemini, sara):
    fake_gemini.error = RuntimeError("Gemini is down")

    response = ask(client, sara["headers"])

    assert response.status_code == 400
    assert response.json()["detail"] == "Sorry, I couldn't process that. Please try again."
