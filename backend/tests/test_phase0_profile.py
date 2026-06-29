import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import app  # noqa: E402
from routers import profile  # noqa: E402


class _Result:
    def __init__(self, data=None):
        self.data = data


class _ProfilesTable:
    def __init__(self, row):
        self.row = row
        self.eq_calls = []
        self.updated_with = None

    def select(self, _columns):
        return self

    def update(self, updates):
        self.updated_with = updates
        self.row.update(updates)
        return self

    def eq(self, column, value):
        self.eq_calls.append((column, value))
        return self

    def single(self):
        return self

    def execute(self):
        return _Result(dict(self.row))


class _AdminClient:
    def __init__(self, table):
        self.profiles_table = table

    def table(self, name):
        assert name == "profiles"
        return self.profiles_table


class Phase0ProfileTests(unittest.TestCase):
    def setUp(self):
        self.user_id = str(uuid4())
        now = datetime(2026, 6, 28, tzinfo=timezone.utc)
        self.profile_row = {
            "id": self.user_id,
            "full_name": "Sanjay",
            "email": "sanjay@example.com",
            "avatar_url": None,
            "college_name": None,
            "degree": None,
            "branch": None,
            "graduation_year": None,
            "career_goal": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        self.table = _ProfilesTable(dict(self.profile_row))
        self.client = TestClient(app)
        app.dependency_overrides[profile.get_current_user_id] = lambda: self.user_id
        profile.get_admin_client = lambda: _AdminClient(self.table)

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_health_check(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_get_profile_returns_authenticated_users_profile(self):
        response = self.client.get("/v1/profile")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.user_id)
        self.assertIn(("id", self.user_id), self.table.eq_calls)

    def test_get_profile_requires_authentication(self):
        app.dependency_overrides.clear()

        response = self.client.get("/v1/profile")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"]["error"]["code"], "unauthorized")

    def test_patch_profile_updates_only_writable_fields(self):
        response = self.client.patch(
            "/v1/profile",
            json={"full_name": "Sanjay Kumar", "degree": "B.Tech"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.table.updated_with,
            {"full_name": "Sanjay Kumar", "degree": "B.Tech"},
        )
        self.assertEqual(response.json()["full_name"], "Sanjay Kumar")
        self.assertIn(("id", self.user_id), self.table.eq_calls)

    def test_patch_profile_rejects_read_only_fields(self):
        response = self.client.patch(
            "/v1/profile",
            json={"email": "new@example.com", "created_at": "2026-01-01T00:00:00Z"},
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["detail"]["error"]["code"], "read_only_field")
        self.assertIsNone(self.table.updated_with)


if __name__ == "__main__":
    unittest.main()
