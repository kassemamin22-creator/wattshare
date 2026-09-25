VALID_PHONE = "+96170123456"
PASSWORD = "secret123"


def register(client, **fields):
    payload = {"name": "Test User", "password": PASSWORD, "role": "subscriber", **fields}
    return client.post("/register", json=payload)


def login(client, identifier, password=PASSWORD):
    return client.post("/login", json={"identifier": identifier, "password": password})


# ---------------------------------------------------------------- register


def test_register_with_email_only(client, fresh_database):
    response = register(client, email="user@x.com")

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "user@x.com"
    assert body["phone"] is None
    assert body["role"] == "subscriber"
    assert "password" not in body

    stored = fresh_database["users"].find_one({"email": "user@x.com"})
    assert stored["password"] != PASSWORD


def test_register_with_phone_only(client):
    response = register(client, phone=VALID_PHONE)

    assert response.status_code == 200
    body = response.json()
    assert body["phone"] == VALID_PHONE
    assert body["email"] is None


def test_register_with_neither_email_nor_phone_is_rejected(client):
    response = register(client)

    assert response.status_code == 422
    assert "Either email or phone is required" in str(response.json()["detail"])


def test_register_with_invalid_lebanese_phone_is_rejected(client):
    response = register(client, phone="+9617012345")

    assert response.status_code == 422
    assert "+961" in str(response.json()["detail"])


def test_register_with_duplicate_email(client):
    assert register(client, email="dup@x.com").status_code == 200

    response = register(client, email="dup@x.com")

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "email_already_registered"


def test_register_with_duplicate_phone(client):
    assert register(client, phone=VALID_PHONE).status_code == 200

    response = register(client, phone=VALID_PHONE)

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "phone_already_registered"


# ------------------------------------------------------------------- login


def test_login_with_email(client):
    register(client, email="user@x.com")

    response = login(client, "user@x.com")

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]

    me = client.get("/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert me.json()["role"] == "subscriber"


def test_login_with_phone(client):
    register(client, phone=VALID_PHONE)

    response = login(client, VALID_PHONE)

    assert response.status_code == 200
    assert response.json()["access_token"]


def test_login_with_wrong_password(client):
    register(client, email="user@x.com")

    response = login(client, "user@x.com", password="wrong-password")

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "invalid_credentials"


def test_login_with_unknown_identifier(client):
    response = login(client, "nobody@x.com")

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "invalid_credentials"


# ---------------------------------------------------- email normalization


def test_email_is_case_insensitive_between_register_and_login(client):
    registered = register(client, email="Test@X.com")
    assert registered.status_code == 200
    assert registered.json()["email"] == "test@x.com"

    assert login(client, "test@x.com").status_code == 200
    assert login(client, "TEST@X.COM").status_code == 200


def test_duplicate_email_check_ignores_case(client):
    assert register(client, email="Test@X.com").status_code == 200

    response = register(client, email="test@x.com")

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "email_already_registered"
