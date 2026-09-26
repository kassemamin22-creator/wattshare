import pytest

PRICE_PER_AMPERE = 10.0
SUBSCRIPTION_BODY = {
    "ampere": 10,
    "address": "Main Street 1",
    "building": "Block A",
    "phone": "+96170123456",
}


@pytest.fixture
def subscriber(make_user):
    return make_user("subscriber", name="Sara Subscriber")


@pytest.fixture
def owner(make_user):
    return make_user("owner", name="Omar Manager")


@pytest.fixture
def admin(make_user):
    return make_user("admin", name="Adam Admin")


@pytest.fixture(autouse=True)
def fixed_price(client, admin):
    """Pin the tariff so flat_fee assertions are exact (default price would work too, this is explicit)."""
    response = client.put(
        "/admin/tariff", json={"price_per_ampere": PRICE_PER_AMPERE}, headers=admin["headers"]
    )
    assert response.status_code == 200


@pytest.fixture
def pending_subscription(client, subscriber):
    response = client.post("/subscription", json=SUBSCRIPTION_BODY, headers=subscriber["headers"])
    assert response.status_code == 200
    return response.json()


@pytest.fixture
def active_subscription(client, owner, pending_subscription):
    response = client.patch(
        f"/owner/subscriptions/{pending_subscription['id']}/approve",
        json={"payment_method": "cash"},
        headers=owner["headers"],
    )
    assert response.status_code == 200
    return response.json()


def my_subscription(client, subscriber):
    response = client.get("/subscription/me", headers=subscriber["headers"])
    assert response.status_code == 200
    return response.json()


# ------------------------------------------------------------------ create


def test_subscriber_creates_a_pending_subscription(client, subscriber):
    response = client.post("/subscription", json=SUBSCRIPTION_BODY, headers=subscriber["headers"])

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "pending"
    assert body["payment_method"] is None
    assert body["subscriber_id"] == subscriber["id"]
    assert body["ampere"] == 10
    assert body["flat_fee"] == 10 * PRICE_PER_AMPERE
    assert body["address"] == "Main Street 1"


def test_subscriber_cannot_create_a_second_subscription(client, subscriber, pending_subscription):
    response = client.post(
        "/subscription", json={**SUBSCRIPTION_BODY, "ampere": 20}, headers=subscriber["headers"]
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Subscription already exists"
    assert my_subscription(client, subscriber)["ampere"] == 10


# ---------------------------------------------------------------- approval


def test_manager_sees_the_pending_subscription(client, owner, subscriber, pending_subscription):
    response = client.get("/owner/subscriptions/pending", headers=owner["headers"])

    assert response.status_code == 200
    pending = response.json()
    assert [item["id"] for item in pending] == [pending_subscription["id"]]
    assert pending[0]["status"] == "pending"
    assert pending[0]["subscriber_name"] == "Sara Subscriber"


def test_manager_approves_with_a_payment_method(client, owner, subscriber, pending_subscription):
    response = client.patch(
        f"/owner/subscriptions/{pending_subscription['id']}/approve",
        json={"payment_method": "whish"},
        headers=owner["headers"],
    )

    assert response.status_code == 200
    assert response.json()["status"] == "active"
    assert response.json()["payment_method"] == "whish"

    stored = my_subscription(client, subscriber)
    assert stored["status"] == "active"
    assert stored["payment_method"] == "whish"


def test_approved_subscription_leaves_the_pending_list(client, owner, active_subscription):
    response = client.get("/owner/subscriptions/pending", headers=owner["headers"])

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.parametrize("role", ["subscriber", "admin"])
def test_only_managers_can_approve_a_subscription(client, make_user, subscriber, pending_subscription, role):
    outsider = subscriber if role == "subscriber" else make_user(role)

    response = client.patch(
        f"/owner/subscriptions/{pending_subscription['id']}/approve",
        json={"payment_method": "cash"},
        headers=outsider["headers"],
    )

    assert response.status_code == 403
    assert my_subscription(client, subscriber)["status"] == "pending"


# ------------------------------------------------------------ ampere change


def test_subscriber_requests_an_ampere_change(client, subscriber, active_subscription):
    response = client.post(
        "/subscription/me/request-ampere-change", json={"ampere": 20}, headers=subscriber["headers"]
    )

    assert response.status_code == 200
    assert response.json()["pending_ampere_change"] == 20

    stored = my_subscription(client, subscriber)
    assert stored["pending_ampere_change"] == 20
    assert stored["ampere"] == 10


@pytest.mark.parametrize("approver_role", ["owner", "admin"])
def test_manager_approves_the_ampere_change(
    client, make_user, subscriber, active_subscription, approver_role
):
    approver = make_user(approver_role)
    client.post(
        "/subscription/me/request-ampere-change", json={"ampere": 20}, headers=subscriber["headers"]
    )

    response = client.patch(
        f"/admin/subscriptions/{active_subscription['id']}/approve-ampere-change",
        headers=approver["headers"],
    )

    assert response.status_code == 200
    assert response.json()["ampere"] == 20
    assert response.json()["flat_fee"] == 20 * PRICE_PER_AMPERE

    stored = my_subscription(client, subscriber)
    assert stored["ampere"] == 20
    assert stored["flat_fee"] == 20 * PRICE_PER_AMPERE
    assert stored["pending_ampere_change"] is None


def test_approving_an_ampere_change_when_none_is_pending_fails(client, owner, active_subscription):
    response = client.patch(
        f"/admin/subscriptions/{active_subscription['id']}/approve-ampere-change",
        headers=owner["headers"],
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "No pending ampere change for this subscription"


def test_an_ampere_change_cannot_be_approved_twice(client, owner, subscriber, active_subscription):
    client.post(
        "/subscription/me/request-ampere-change", json={"ampere": 20}, headers=subscriber["headers"]
    )
    url = f"/admin/subscriptions/{active_subscription['id']}/approve-ampere-change"
    assert client.patch(url, headers=owner["headers"]).status_code == 200

    second = client.patch(url, headers=owner["headers"])

    assert second.status_code == 400
    assert my_subscription(client, subscriber)["ampere"] == 20


# ------------------------------------------------------------------ editing


@pytest.mark.parametrize("editor_role", ["owner", "admin"])
def test_manager_edits_subscriber_info_and_flat_fee_follows_ampere(
    client, make_user, subscriber, active_subscription, editor_role
):
    editor = make_user(editor_role)

    response = client.patch(
        f"/admin/subscriptions/{active_subscription['id']}",
        json={"address": "New Street 9", "building": "Block B", "phone": "+96171999999", "ampere": 30},
        headers=editor["headers"],
    )

    assert response.status_code == 200
    body = response.json()
    assert body["address"] == "New Street 9"
    assert body["building"] == "Block B"
    assert body["phone"] == "+96171999999"
    assert body["ampere"] == 30
    assert body["flat_fee"] == 30 * PRICE_PER_AMPERE

    stored = my_subscription(client, subscriber)
    assert stored["address"] == "New Street 9"
    assert stored["ampere"] == 30
    assert stored["flat_fee"] == 30 * PRICE_PER_AMPERE


def test_editing_without_an_ampere_keeps_the_current_ampere(client, owner, active_subscription):
    response = client.patch(
        f"/admin/subscriptions/{active_subscription['id']}",
        json={"address": "Elsewhere 2", "building": "Block C", "phone": "+96171000000"},
        headers=owner["headers"],
    )

    assert response.status_code == 200
    assert response.json()["address"] == "Elsewhere 2"
    assert response.json()["ampere"] == 10
    assert response.json()["flat_fee"] == 10 * PRICE_PER_AMPERE


def test_a_subscriber_cannot_use_the_admin_edit_endpoint(client, subscriber, active_subscription):
    response = client.patch(
        f"/admin/subscriptions/{active_subscription['id']}",
        json={"address": "Hacked 1", "building": "X", "phone": "+96170000000", "ampere": 500},
        headers=subscriber["headers"],
    )

    assert response.status_code == 403
    assert my_subscription(client, subscriber)["ampere"] == 10
