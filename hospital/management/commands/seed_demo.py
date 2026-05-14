from datetime import datetime, timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from hospital.models import HDy, HInfo, HScore, HZhzl, UserProfile


class Command(BaseCommand):
    help = "Seed sanitized demo users, hospitals, scores, survey records, and governance records."

    def handle(self, *args, **options):
        hospitals = [
            ("首都示例医院一院", "海淀区", "三级甲等医院", 116.3152, 39.9767),
            ("首都示例医院二院", "海淀区", "三级甲等医院", 116.3600, 39.9826),
            ("城市示例中医医院", "西城区", "三级甲等医院", 116.3773, 39.9527),
            ("城市示例儿童医院", "西城区", "三级甲等医院", 116.3546, 39.9123),
            ("朝阳示例综合医院", "朝阳区", "三级甲等医院", 116.4601, 39.9311),
            ("东城示例协同医院", "东城区", "三级甲等医院", 116.4142, 39.9113),
            ("丰台示例康复医院", "丰台区", "二级甲等医院", 116.3616, 39.8593),
            ("石景山示例医院", "石景山区", "二级甲等医院", 116.2031, 39.9291),
            ("通州示例中心医院", "通州区", "三级乙等医院", 116.6570, 39.9099),
            ("昌平示例医院", "昌平区", "二级甲等医院", 116.2312, 40.2207),
            ("大兴示例医院", "大兴区", "三级乙等医院", 116.3413, 39.7421),
            ("顺义示例医院", "顺义区", "二级甲等医院", 116.6547, 40.1302),
        ]
        hospital_objs = []
        for item in hospitals:
            hospital, _ = HInfo.objects.update_or_create(
                h_name=item[0],
                defaults={
                    "h_area": item[1],
                    "h_type": item[2],
                    "h_lng": item[3],
                    "h_lat": item[4],
                    "is_active": True,
                },
            )
            hospital_objs.append(hospital)

        admin = self._user("demo_admin", "DemoAdmin123!", is_staff=True, is_superuser=True)
        surveyor = self._user("demo_surveyor", "DemoSurvey123!")
        hospital_user = self._user("demo_hospital", "DemoHospital123!")
        UserProfile.objects.update_or_create(user=admin, defaults={"role": UserProfile.ROLE_ADMIN, "hospital": None})
        UserProfile.objects.update_or_create(user=surveyor, defaults={"role": UserProfile.ROLE_SURVEYOR, "hospital": None})
        UserProfile.objects.update_or_create(
            user=hospital_user,
            defaults={"role": UserProfile.ROLE_HOSPITAL, "hospital": hospital_objs[0]},
        )

        now = timezone.make_aware(datetime(2026, 1, 15, 9, 0, 0))
        for index, hospital in enumerate(hospital_objs):
            base = 96 - index * 1.8
            for quarter in range(3):
                score = max(72, base - quarter * 1.2)
                HScore.objects.update_or_create(
                    hospital=hospital,
                    test_time=now - timedelta(days=90 * quarter),
                    defaults={
                        "hybl_s1": 5,
                        "jzl_s1": 8 + index % 3,
                        "jzsj_s1": 8,
                        "tcw_s1": 7 + index % 4,
                        "jt_s2": 2,
                        "gj_s2": 2,
                        "xsjs_s2": 2,
                        "xr_s2": 2,
                        "jp_s2": 1 + index % 2,
                        "ydry_s3": 5 if index % 2 == 0 else 3,
                        "gltf_s3": 5,
                        "tcgx_s4": 5 if index % 3 else 3,
                        "wftc_s4": 5 if index % 4 else 2,
                        "fjdclf_s4": 4,
                        "sbjs_s5": 14,
                        "phdy_s5": 14,
                        "s1_score": min(35, 28 + index % 5),
                        "s2_score": min(10, 8 + index % 3),
                        "s3_score": 8 + index % 2,
                        "s4_score": 10 + index % 4,
                        "s5_score": 26 + index % 3,
                        "sum_score": round(score, 1),
                    },
                )

            HDy.objects.get_or_create(
                hospital=hospital,
                surveyor=surveyor,
                dy_date=now - timedelta(days=index + 1),
                defaults={
                    "ydry": index % 2 == 0,
                    "gltf": True,
                    "tcgx": index % 3 != 0,
                    "wftc": index % 4 == 0,
                    "fjdclf": index % 5 == 0,
                    "bz": "脱敏样例调研记录，用于展示现场治理信息采集流程。",
                },
            )
            HZhzl.objects.get_or_create(
                hospital=hospital,
                reporter=admin,
                date_time=now - timedelta(days=index + 3),
                defaults={
                    "zhzl_type": HZhzl.TYPE_INITIAL,
                    "hybl": 52 + index,
                    "jzl": 78 + index % 10,
                    "jzsj": 30 - index % 6,
                    "tcw": 64 + index % 8,
                    "znxt": index % 2 == 0,
                    "jt": True,
                    "gj": index % 3 != 0,
                    "xsjs": True,
                    "xr": True,
                    "jp": index % 4 != 0,
                    "wza": index % 2 == 0,
                },
            )

        self.stdout.write(self.style.SUCCESS("Seeded hospital1 demo data."))

    def _user(self, username, password, is_staff=False, is_superuser=False):
        user, created = User.objects.get_or_create(username=username)
        user.is_staff = is_staff
        user.is_superuser = is_superuser
        user.email = f"{username}@example.com"
        if created or not user.has_usable_password():
            user.set_password(password)
        user.save()
        return user
