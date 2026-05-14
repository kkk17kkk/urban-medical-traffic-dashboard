import json

from django.contrib import messages
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import PasswordChangeForm
from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from .models import HDy, HImage, HInfo, HScore, HZhzl, UserProfile
from .services import build_dashboard_payload, latest_scores, refresh_hospital_score


def user_role(user):
    if not user.is_authenticated:
        return None
    if user.is_superuser:
        return UserProfile.ROLE_ADMIN
    return getattr(getattr(user, "profile", None), "role", None)


def require_roles(user, *roles):
    role = user_role(user)
    if role not in roles:
        raise PermissionDenied("当前账号没有访问该功能的权限。")


def yes_no(value):
    return str(value).strip() in {"是", "true", "True", "1", "on", "yes"}


def parse_float(value, field_name, required=False):
    if value in (None, ""):
        if required:
            raise ValidationError(f"{field_name}不能为空")
        return None
    value = str(value).replace("：", ":").split(":")[0].strip()
    try:
        return float(value)
    except ValueError as exc:
        raise ValidationError(f"{field_name}必须是数字") from exc


def validation_message(exc):
    if hasattr(exc, "message_dict"):
        return "；".join(f"{field}: {'，'.join(messages)}" for field, messages in exc.message_dict.items())
    if hasattr(exc, "messages"):
        return "；".join(exc.messages)
    return str(exc)


def scoped_hospitals(user, include_inactive=False):
    queryset = HInfo.objects.all()
    if not include_inactive:
        queryset = queryset.filter(is_active=True)
    profile = getattr(user, "profile", None)
    if user_role(user) == UserProfile.ROLE_HOSPITAL and profile and profile.hospital_id:
        queryset = queryset.filter(id=profile.hospital_id)
    return queryset


def index(request):
    if request.user.is_authenticated:
        return redirect("scanboard")
    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")
        user = authenticate(request, username=username, password=password)
        if user is None:
            return render(request, "index.html", {"alert_message": "用户名或密码错误。"})
        login(request, user)
        return redirect("scanboard")
    return render(request, "index.html")


def logout_view(request):
    logout(request)
    return redirect("index")


@login_required
def change_password(request):
    if request.method == "POST":
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)
            messages.success(request, "密码已更新。")
        else:
            messages.error(request, "密码修改失败，请检查旧密码和新密码。")
    return redirect("scanboard")


@login_required
def scanboard(request):
    hospitals = scoped_hospitals(request.user)
    scores = latest_scores(hospitals)
    dashboard_payload = build_dashboard_payload(hospitals, scores)
    selected_hospital = hospitals.first()
    selected_score = next((score for score in scores if selected_hospital and score.hospital_id == selected_hospital.id), None)
    context = {
        "hinfo": hospitals,
        "hscore": scores,
        "hinfo_user": selected_hospital,
        "hscore_user": selected_score,
        "area_scores": dashboard_payload["area_ranking"],
        "role": user_role(request.user),
        "dashboard": dashboard_payload,
        "dashboard_json": json.dumps(dashboard_payload, ensure_ascii=False),
        "amap_key": settings.AMAP_WEB_KEY,
    }
    return render(request, "hospital/scanboard.html", context)


@login_required
def yygl(request):
    require_roles(request.user, UserProfile.ROLE_ADMIN)
    return render(request, "hospital/yygl.html", {"hospitals": filter_hospitals(request), "amap_key": settings.AMAP_WEB_KEY})


@login_required
def hospital_search(request):
    require_roles(request.user, UserProfile.ROLE_ADMIN)
    return render(request, "hospital/yygl.html", {"hospitals": filter_hospitals(request), "amap_key": settings.AMAP_WEB_KEY})


def filter_hospitals(request):
    hospitals = HInfo.objects.all().order_by("id")
    hospital_id = request.GET.get("hospitalId", "").strip()
    hospital_name = request.GET.get("hospitalName", "").strip()
    hospital_district = request.GET.get("hospitalDistrict", "").strip()
    hospital_type = request.GET.get("hospitalType", "").strip()
    status = request.GET.get("status", "active").strip()
    if status == "active":
        hospitals = hospitals.filter(is_active=True)
    elif status == "inactive":
        hospitals = hospitals.filter(is_active=False)
    if hospital_id:
        hospitals = hospitals.filter(id=hospital_id)
    if hospital_name:
        hospitals = hospitals.filter(h_name__icontains=hospital_name)
    if hospital_district:
        hospitals = hospitals.filter(h_area=hospital_district)
    if hospital_type:
        hospitals = hospitals.filter(h_type=hospital_type)
    return hospitals


@login_required
@require_POST
def add_hospital(request):
    require_roles(request.user, UserProfile.ROLE_ADMIN)
    data = json.loads(request.body.decode("utf-8")) if request.body else request.POST
    try:
        name = data.get("hospitalName", "").strip()
        area = data.get("hospitalArea", "").strip()
        hospital_type = data.get("hospitalType", "").strip()
        if not name or not area or not hospital_type:
            raise ValidationError("医院名称、区属和类型均不能为空")
        hospital = HInfo(
            h_name=name,
            h_area=area,
            h_type=hospital_type,
            h_lng=parse_float(data.get("hospitalLng"), "经度", required=True),
            h_lat=parse_float(data.get("hospitalLat"), "纬度", required=True),
        )
        hospital.full_clean()
        hospital.save()
    except Exception as exc:
        return JsonResponse({"success": False, "message": validation_message(exc)}, status=400)
    return JsonResponse({"success": True, "id": hospital.id}, status=201)


@login_required
@require_http_methods(["DELETE", "POST"])
def delete_hospital(request, hospital_id):
    require_roles(request.user, UserProfile.ROLE_ADMIN)
    hospital = get_object_or_404(HInfo, pk=hospital_id)
    hospital.is_active = False
    hospital.save(update_fields=["is_active", "updated_at"])
    return JsonResponse({"success": True, "message": "医院已停用"})


@login_required
@require_GET
def get_hospital_info(request, hospital_id):
    require_roles(request.user, UserProfile.ROLE_ADMIN)
    hospital = get_object_or_404(HInfo, pk=hospital_id)
    return JsonResponse({
        "id": hospital.id,
        "h_name": hospital.h_name,
        "h_area": hospital.h_area,
        "h_type": hospital.h_type,
        "h_lng": hospital.h_lng,
        "h_lat": hospital.h_lat,
        "is_active": hospital.is_active,
    })


@login_required
@require_POST
def update_hospital(request):
    require_roles(request.user, UserProfile.ROLE_ADMIN)
    hospital = get_object_or_404(HInfo, pk=request.POST.get("hospitalId"))
    try:
        hospital.h_name = request.POST.get("hospitalName", "").strip()
        hospital.h_area = request.POST.get("hospitalArea", "").strip()
        hospital.h_type = request.POST.get("hospitalType", "").strip()
        hospital.h_lng = parse_float(request.POST.get("hospitalLng"), "经度", required=True)
        hospital.h_lat = parse_float(request.POST.get("hospitalLat"), "纬度", required=True)
        hospital.is_active = True
        hospital.full_clean()
        hospital.save()
    except Exception as exc:
        return JsonResponse({"success": False, "message": validation_message(exc)}, status=400)
    return JsonResponse({"success": True})


@login_required
def dybtj(request):
    require_roles(request.user, UserProfile.ROLE_ADMIN, UserProfile.ROLE_SURVEYOR)
    h_areas = HInfo.objects.filter(is_active=True).values_list("h_area", flat=True).distinct().order_by("h_area")
    return render(request, "hospital/dybtj_demo.html", {"h_areas": list(h_areas)})


@login_required
@require_GET
def get_hospitals_by_area(request):
    require_roles(request.user, UserProfile.ROLE_ADMIN, UserProfile.ROLE_SURVEYOR, UserProfile.ROLE_HOSPITAL)
    area = request.GET.get("area", "").strip()
    hospitals = scoped_hospitals(request.user)
    if area:
        hospitals = hospitals.filter(h_area=area)
    return JsonResponse({"hospitals": list(hospitals.order_by("h_name").values("id", "h_name"))})


@login_required
@require_POST
def add_dyb(request):
    require_roles(request.user, UserProfile.ROLE_ADMIN, UserProfile.ROLE_SURVEYOR)
    hospital = get_object_or_404(HInfo, pk=request.POST.get("h_id"), is_active=True)
    survey = HDy.objects.create(
        hospital=hospital,
        surveyor=request.user,
        dy_date=timezone.now(),
        ydry=yes_no(request.POST.get("YDRY")),
        gltf=yes_no(request.POST.get("GLTF")),
        tcgx=yes_no(request.POST.get("TCGX")),
        wftc=yes_no(request.POST.get("WFTC")),
        fjdclf=yes_no(request.POST.get("FJDCLF")),
        bz=request.POST.get("BZ", "").strip(),
    )
    image_map = {
        "YDRY_img": HImage.CATEGORY_YDRY,
        "GLTF_img": HImage.CATEGORY_GLTF,
        "TCGX_img": HImage.CATEGORY_TCGX,
        "WFTC_img": HImage.CATEGORY_WFTC,
        "FJDCLF_img": HImage.CATEGORY_FJDCLF,
    }
    for field_name, category in image_map.items():
        image = request.FILES.get(field_name)
        if image:
            if image.size > 5 * 1024 * 1024:
                return JsonResponse({"success": False, "message": "单张图片不能超过 5MB。"}, status=400)
            if image.content_type and not image.content_type.startswith("image/"):
                return JsonResponse({"success": False, "message": "只能上传图片文件。"}, status=400)
            HImage.objects.create(survey=survey, category=category, image_file=image)
    refresh_hospital_score(hospital)
    return JsonResponse({"success": True, "message": "调研信息已保存。", "survey_id": survey.id})


@login_required
def v_zhzl(request):
    require_roles(request.user, UserProfile.ROLE_ADMIN)
    hospitals = HInfo.objects.filter(is_active=True).order_by("h_area", "h_name")
    if request.method == "POST":
        hospital = get_object_or_404(HInfo, pk=request.POST.get("hospital_id"), is_active=True)
        try:
            zhzl_type = int(request.POST.get("zhzl_type") or HZhzl.TYPE_INITIAL)
            if zhzl_type not in dict(HZhzl.TYPE_CHOICES):
                raise ValidationError("治理类型不合法")
            governance = HZhzl(
                hospital=hospital,
                reporter=request.user,
                zhzl_type=zhzl_type,
                date_time=timezone.now(),
                hybl=parse_float(request.POST.get("HYBL"), "号源比例"),
                jzl=parse_float(request.POST.get("JZL"), "预约就诊率"),
                jzsj=parse_float(request.POST.get("JZSJ"), "精准就诊时间"),
                tcw=parse_float(request.POST.get("TCW"), "停车位开放比例"),
                znxt=yes_no(request.POST.get("ZNXT")),
                jt=yes_no(request.POST.get("JT")),
                gj=yes_no(request.POST.get("GJ")),
                xsjs=yes_no(request.POST.get("XSJS")),
                xr=yes_no(request.POST.get("XR")),
                jp=yes_no(request.POST.get("JP")),
                wza=yes_no(request.POST.get("WZA")),
            )
            governance.full_clean()
            governance.save()
            refresh_hospital_score(hospital)
        except Exception as exc:
            messages.error(request, f"提交失败：{validation_message(exc)}")
        else:
            messages.success(request, "综合治理信息已提交。")
        return redirect("zhzl")
    return render(request, "hospital/zhzl_demo.html", {"hospitals": hospitals})


@login_required
@require_GET
def dashboard_data(request):
    hospitals = scoped_hospitals(request.user)
    scores = latest_scores(hospitals)
    return JsonResponse(build_dashboard_payload(hospitals, scores))
