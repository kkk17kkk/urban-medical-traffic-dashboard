from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone
import json

from .models import HDy, HInfo, HScore, HZhzl, UserProfile


class DemoFlowTests(TestCase):
    def setUp(self):
        self.hospital = HInfo.objects.create(
            h_name="测试示例医院",
            h_area="海淀区",
            h_type="三级甲等医院",
            h_lng=116.3,
            h_lat=39.9,
        )
        HScore.objects.create(
            hospital=self.hospital,
            test_time=timezone.now(),
            s1_score=30,
            s2_score=9,
            s3_score=10,
            s4_score=12,
            s5_score=28,
            sum_score=89,
        )
        self.admin = User.objects.create_user("admin_demo", password="DemoPass123!")
        UserProfile.objects.create(user=self.admin, role=UserProfile.ROLE_ADMIN)
        self.surveyor = User.objects.create_user("surveyor_demo", password="DemoPass123!")
        UserProfile.objects.create(user=self.surveyor, role=UserProfile.ROLE_SURVEYOR)
        self.hospital_user = User.objects.create_user("hospital_demo", password="DemoPass123!")
        UserProfile.objects.create(user=self.hospital_user, role=UserProfile.ROLE_HOSPITAL, hospital=self.hospital)
        self.client = Client()

    def test_login_and_dashboard(self):
        response = self.client.post(reverse("index"), {"username": "admin_demo", "password": "DemoPass123!"})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("scanboard"))
        response = self.client.get(reverse("scanboard"))
        self.assertContains(response, "测试示例医院")

    def test_hospital_api_soft_delete(self):
        self.client.login(username="admin_demo", password="DemoPass123!")
        response = self.client.post(
            reverse("add_hospital"),
            data=json.dumps({
                "hospitalName": "新增示例医院",
                "hospitalArea": "朝阳区",
                "hospitalType": "二级甲等医院",
                "hospitalLng": "116.4",
                "hospitalLat": "39.8",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        hospital_id = response.json()["id"]
        response = self.client.delete(reverse("delete_hospital", args=[hospital_id]))
        self.assertTrue(response.json()["success"])
        self.assertFalse(HInfo.objects.get(id=hospital_id).is_active)

    def test_governance_submission_refreshes_score(self):
        self.client.login(username="admin_demo", password="DemoPass123!")
        response = self.client.post(
            reverse("zhzl"),
            {
                "hospital_id": self.hospital.id,
                "zhzl_type": HZhzl.TYPE_INITIAL,
                "HYBL": "80",
                "JZL": "90",
                "JZSJ": "20",
                "TCW": "70",
                "JT": "是",
                "GJ": "是",
                "XSJS": "是",
                "XR": "是",
                "JP": "是",
                "WZA": "是",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertTrue(HZhzl.objects.filter(hospital=self.hospital).exists())
        self.assertGreater(HScore.objects.filter(hospital=self.hospital).order_by("-test_time").first().sum_score, 0)

    def test_survey_submission_refreshes_score(self):
        self.client.login(username="surveyor_demo", password="DemoPass123!")
        response = self.client.post(
            reverse("add_dyb"),
            {
                "h_id": self.hospital.id,
                "YDRY": "是",
                "GLTF": "是",
                "TCGX": "是",
                "WFTC": "否",
                "FJDCLF": "否",
                "BZ": "现场秩序良好",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertTrue(HDy.objects.filter(hospital=self.hospital).exists())
        self.assertGreater(HScore.objects.filter(hospital=self.hospital).order_by("-test_time").first().s3_score, 0)

    def test_hospital_user_dashboard_scope(self):
        other = HInfo.objects.create(
            h_name="其他示例医院",
            h_area="朝阳区",
            h_type="二级甲等医院",
            h_lng=116.4,
            h_lat=39.8,
        )
        HScore.objects.create(hospital=other, test_time=timezone.now(), sum_score=95)
        self.client.login(username="hospital_demo", password="DemoPass123!")
        response = self.client.get(reverse("dashboard_data"))
        self.assertEqual(response.status_code, 200)
        names = [item["name"] for item in response.json()["hospitals"]]
        self.assertEqual(names, ["测试示例医院"])

    def test_invalid_hospital_coordinate_is_rejected(self):
        self.client.login(username="admin_demo", password="DemoPass123!")
        response = self.client.post(
            reverse("add_hospital"),
            data=json.dumps({
                "hospitalName": "坐标错误医院",
                "hospitalArea": "海淀区",
                "hospitalType": "二级甲等医院",
                "hospitalLng": "200",
                "hospitalLat": "39.8",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(HInfo.objects.filter(h_name="坐标错误医院").exists())
