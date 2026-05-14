from django.db.models import Avg, OuterRef, Subquery
from django.utils import timezone

from .models import HDy, HInfo, HScore, HZhzl


SCORE_FIELDS = [
    {"key": "hybl_s1", "label": "上下午门诊号源比例", "group": "s1", "max": 5},
    {"key": "jzl_s1", "label": "预约就诊率", "group": "s1", "max": 10},
    {"key": "jzsj_s1", "label": "预约就诊精准时间", "group": "s1", "max": 10},
    {"key": "tcw_s1", "label": "停车位开放比例", "group": "s1", "max": 10},
    {"key": "jt_s2", "label": "禁停标志标线", "group": "s2", "max": 2},
    {"key": "gj_s2", "label": "行人过街设施", "group": "s2", "max": 2},
    {"key": "xsjs_s2", "label": "限速或减速标识", "group": "s2", "max": 2},
    {"key": "xr_s2", "label": "注意行人标志", "group": "s2", "max": 2},
    {"key": "jp_s2", "label": "非现场执法监拍设施", "group": "s2", "max": 2},
    {"key": "ydry_s3", "label": "工作人员引导机动车入院", "group": "s3", "max": 5},
    {"key": "gltf_s3", "label": "管理非机动车停放", "group": "s3", "max": 5},
    {"key": "tcgx_s4", "label": "停车资源共享", "group": "s4", "max": 5},
    {"key": "wftc_s4", "label": "机动车违法停车治理", "group": "s4", "max": 5},
    {"key": "fjdclf_s4", "label": "非机动车乱停乱放治理", "group": "s4", "max": 5},
    {"key": "sbjs_s5", "label": "数据上报及时", "group": "s5", "max": 15},
    {"key": "phdy_s5", "label": "积极配合调研", "group": "s5", "max": 15},
]

SCORE_GROUPS = [
    {"key": "s1", "score_field": "s1_score", "label": "内部管理", "max": 35},
    {"key": "s2", "score_field": "s2_score", "label": "交通基础设施", "max": 10},
    {"key": "s3", "score_field": "s3_score", "label": "人员引导", "max": 10},
    {"key": "s4", "score_field": "s4_score", "label": "交通秩序", "max": 15},
    {"key": "s5", "score_field": "s5_score", "label": "主动积极", "max": 30},
]


def _ratio_score(value, maximum, lower_is_better=False):
    if value is None:
        return 0
    value = float(value)
    if lower_is_better:
        return maximum if value <= 30 else max(0, maximum - (value - 30) / 7)
    return max(0, min(maximum, value / 100 * maximum))


def _bool_score(value, maximum, negative=False):
    return maximum if bool(value) != negative else 0


def calculate_score(governance=None, survey=None):
    values = {
        "hybl_s1": _ratio_score(getattr(governance, "hybl", None), 5),
        "jzl_s1": _ratio_score(getattr(governance, "jzl", None), 10),
        "jzsj_s1": _ratio_score(getattr(governance, "jzsj", None), 10, lower_is_better=True),
        "tcw_s1": _ratio_score(getattr(governance, "tcw", None), 10),
        "jt_s2": _bool_score(getattr(governance, "jt", False), 2),
        "gj_s2": _bool_score(getattr(governance, "gj", False), 2),
        "xsjs_s2": _bool_score(getattr(governance, "xsjs", False), 2),
        "xr_s2": _bool_score(getattr(governance, "xr", False), 2),
        "jp_s2": _bool_score(getattr(governance, "jp", False), 2),
        "ydry_s3": _bool_score(getattr(survey, "ydry", False), 5),
        "gltf_s3": _bool_score(getattr(survey, "gltf", False), 5),
        "tcgx_s4": _bool_score(getattr(survey, "tcgx", False), 5),
        "wftc_s4": _bool_score(getattr(survey, "wftc", False), 5, negative=True),
        "fjdclf_s4": _bool_score(getattr(survey, "fjdclf", False), 5, negative=True),
        "sbjs_s5": 15 if governance else 0,
        "phdy_s5": 15 if survey else 0,
    }
    for key, value in values.items():
        values[key] = round(value, 2)
    for group in SCORE_GROUPS:
        keys = [field["key"] for field in SCORE_FIELDS if field["group"] == group["key"]]
        values[group["score_field"]] = round(sum(values[key] for key in keys), 2)
    values["sum_score"] = round(sum(values[group["score_field"]] for group in SCORE_GROUPS), 2)
    return values


def refresh_hospital_score(hospital, test_time=None):
    governance = hospital.governance_records.order_by("-date_time").first()
    survey = hospital.surveys.order_by("-dy_date").first()
    values = calculate_score(governance=governance, survey=survey)
    return HScore.objects.create(
        hospital=hospital,
        test_time=test_time or timezone.now(),
        **values,
    )


def latest_scores(hospitals=None):
    queryset = HScore.objects.select_related("hospital")
    if hospitals is not None:
        queryset = queryset.filter(hospital__in=hospitals)
    latest_id = (
        HScore.objects.filter(hospital_id=OuterRef("hospital_id"))
        .order_by("-test_time", "-id")
        .values("id")[:1]
    )
    return queryset.filter(id=Subquery(latest_id)).order_by("-sum_score", "hospital__h_area", "hospital__h_name")


def score_to_groups(score):
    if not score:
        return []
    return [
        {
            "key": group["key"],
            "label": group["label"],
            "score": getattr(score, group["score_field"]),
            "max": group["max"],
            "percent": round(getattr(score, group["score_field"]) / group["max"] * 100, 1),
        }
        for group in SCORE_GROUPS
    ]


def score_to_indicators(score):
    if not score:
        return []
    return [
        {
            "key": field["key"],
            "label": field["label"],
            "score": getattr(score, field["key"]),
            "max": field["max"],
            "group": field["group"],
        }
        for field in SCORE_FIELDS
    ]


def build_dashboard_payload(hospitals, scores):
    hospitals = list(hospitals)
    scores = list(scores)
    score_by_hospital = {score.hospital_id: score for score in scores}
    selected_hospital = hospitals[0] if hospitals else None
    selected_score = score_by_hospital.get(selected_hospital.id) if selected_hospital else None
    area_scores = (
        HScore.objects.filter(id__in=[score.id for score in scores])
        .values("hospital__h_area")
        .annotate(avg_score=Avg("sum_score"))
        .order_by("-avg_score", "hospital__h_area")
    )
    city_avg = round(sum(score.sum_score for score in scores) / len(scores), 1) if scores else None
    selected_area_avg = None
    if selected_hospital:
        area_values = [score.sum_score for score in scores if score.hospital.h_area == selected_hospital.h_area]
        selected_area_avg = round(sum(area_values) / len(area_values), 1) if area_values else None
    trend = []
    if selected_hospital:
        trend = [
            {"label": score.test_time.strftime("%Y-%m-%d"), "score": score.sum_score}
            for score in selected_hospital.scores.order_by("test_time")[:20]
        ]
    latest_survey = None
    if selected_hospital:
        survey = (
            HDy.objects.filter(hospital=selected_hospital)
            .prefetch_related("images")
            .order_by("-dy_date")
            .first()
        )
        if survey:
            latest_survey = {
                "date": survey.dy_date.strftime("%Y-%m-%d %H:%M"),
                "ydry": survey.ydry,
                "gltf": survey.gltf,
                "tcgx": survey.tcgx,
                "wftc": survey.wftc,
                "fjdclf": survey.fjdclf,
                "remark": survey.bz,
                "images": [
                    {"category": image.get_category_display(), "url": image.image_file.url}
                    for image in survey.images.all()
                ],
            }
    latest_governance = None
    if selected_hospital:
        governance = HZhzl.objects.filter(hospital=selected_hospital).order_by("-date_time").first()
        if governance:
            latest_governance = {
                "date": governance.date_time.strftime("%Y-%m-%d %H:%M"),
                "type": governance.get_zhzl_type_display(),
                "hybl": governance.hybl,
                "jzl": governance.jzl,
                "jzsj": governance.jzsj,
                "tcw": governance.tcw,
            }
    return {
        "hospitals": [
            {
                "id": hospital.id,
                "name": hospital.h_name,
                "area": hospital.h_area,
                "type": hospital.h_type,
                "lng": hospital.h_lng,
                "lat": hospital.h_lat,
                "score": score_by_hospital.get(hospital.id).sum_score if score_by_hospital.get(hospital.id) else None,
            }
            for hospital in hospitals
        ],
        "selected": {
            "hospital": {
                "id": selected_hospital.id,
                "name": selected_hospital.h_name,
                "area": selected_hospital.h_area,
                "type": selected_hospital.h_type,
            } if selected_hospital else None,
            "score": selected_score.sum_score if selected_score else None,
            "groups": score_to_groups(selected_score),
            "indicators": score_to_indicators(selected_score),
            "trend": trend,
            "survey": latest_survey,
            "governance": latest_governance,
        },
        "ranking": [
            {"rank": index + 1, "name": score.hospital.h_name, "area": score.hospital.h_area, "score": score.sum_score}
            for index, score in enumerate(scores[:10])
        ],
        "area_ranking": [
            {"rank": index + 1, "area": item["hospital__h_area"], "score": round(item["avg_score"], 1)}
            for index, item in enumerate(area_scores)
        ],
        "summary": {
            "city_avg": city_avg,
            "selected_area_avg": selected_area_avg,
            "hospital_count": len(hospitals),
            "scored_count": len(scores),
        },
    }
