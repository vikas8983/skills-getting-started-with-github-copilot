from fastapi.testclient import TestClient
import pytest

from src.app import app, activities


@pytest.fixture(autouse=True)
def reset_activities():
    # Make a shallow copy of initial data and restore after each test
    orig = {k: {**v, "participants": list(v["participants"])} for k, v in activities.items()}
    yield
    activities.clear()
    activities.update({k: {**v, "participants": list(orig[k]["participants"])} for k, v in orig.items()})


def test_get_activities():
    client = TestClient(app)
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"]["participants"], list)


def test_signup_and_prevent_duplicate():
    client = TestClient(app)
    # signup a new user
    resp = client.post("/activities/Chess%20Club/signup?email=testuser@example.org")
    assert resp.status_code == 200
    assert "Signed up testuser@example.org for Chess Club" in resp.json().get("message", "")

    # duplicate signup should fail with 400
    resp2 = client.post("/activities/Chess%20Club/signup?email=testuser@example.org")
    assert resp2.status_code == 400


def test_unregister_and_errors():
    client = TestClient(app)
    # Ensure an existing participant can be unregistered
    resp = client.post("/activities/Chess%20Club/unregister?email=michael@mergington.edu")
    assert resp.status_code == 200
    assert "Unregistered michael@mergington.edu from Chess Club" in resp.json().get("message", "")

    # Unregistering someone not in the list should give 404
    resp2 = client.post("/activities/Chess%20Club/unregister?email=notfound@example.org")
    assert resp2.status_code == 404
