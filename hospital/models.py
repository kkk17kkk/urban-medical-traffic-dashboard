from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class HInfo(models.Model):
    """Hospital profile used by the demo dashboards and data-entry flows."""

    h_name = models.CharField("医院名称", max_length=100, unique=True)
    h_area = models.CharField("区属", max_length=50)
    h_type = models.CharField("医院类型", max_length=50)
    h_lng = models.FloatField("经度")
    h_lat = models.FloatField("纬度")
    is_active = models.BooleanField("启用", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "h_info"
        ordering = ["id"]
        verbose_name = "医院"
        verbose_name_plural = "医院"

    def __str__(self):
        return self.h_name

    def clean(self):
        super().clean()
        if not (73 <= self.h_lng <= 136):
            raise ValidationError({"h_lng": "经度应在中国常用坐标范围内"})
        if not (3 <= self.h_lat <= 54):
            raise ValidationError({"h_lat": "纬度应在中国常用坐标范围内"})


class UserProfile(models.Model):
    ROLE_ADMIN = "admin"
    ROLE_SURVEYOR = "surveyor"
    ROLE_HOSPITAL = "hospital"
    ROLE_CHOICES = [
        (ROLE_ADMIN, "管理员"),
        (ROLE_SURVEYOR, "调研员"),
        (ROLE_HOSPITAL, "医院用户"),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    hospital = models.ForeignKey(HInfo, on_delete=models.SET_NULL, blank=True, null=True, related_name="users")

    class Meta:
        db_table = "user_profile"
        verbose_name = "用户资料"
        verbose_name_plural = "用户资料"

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


class HScore(models.Model):
    hospital = models.ForeignKey(HInfo, on_delete=models.CASCADE, related_name="scores")
    test_time = models.DateTimeField("评分时间")
    hybl_s1 = models.FloatField(default=0)
    jzl_s1 = models.FloatField(default=0)
    jzsj_s1 = models.FloatField(default=0)
    tcw_s1 = models.FloatField(default=0)
    jt_s2 = models.FloatField(default=0)
    gj_s2 = models.FloatField(default=0)
    xsjs_s2 = models.FloatField(default=0)
    xr_s2 = models.FloatField(default=0)
    jp_s2 = models.FloatField(default=0)
    ydry_s3 = models.FloatField(default=0)
    gltf_s3 = models.FloatField(default=0)
    tcgx_s4 = models.FloatField(default=0)
    wftc_s4 = models.FloatField(default=0)
    fjdclf_s4 = models.FloatField(default=0)
    sbjs_s5 = models.FloatField(default=0)
    phdy_s5 = models.FloatField(default=0)
    s1_score = models.FloatField(default=0)
    s2_score = models.FloatField(default=0)
    s3_score = models.FloatField(default=0)
    s4_score = models.FloatField(default=0)
    s5_score = models.FloatField(default=0)
    sum_score = models.FloatField(default=0)

    class Meta:
        db_table = "h_score"
        ordering = ["-sum_score", "hospital__h_area", "hospital__h_name"]
        indexes = [models.Index(fields=["hospital", "test_time"])]
        verbose_name = "评分"
        verbose_name_plural = "评分"

    @property
    def h_name(self):
        return self.hospital.h_name

    @property
    def h_area(self):
        return self.hospital.h_area

    def __str__(self):
        return f"{self.hospital.h_name} {self.sum_score}"


class HDy(models.Model):
    hospital = models.ForeignKey(HInfo, on_delete=models.CASCADE, related_name="surveys")
    surveyor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="surveys",
    )
    dy_date = models.DateTimeField("调研时间")
    ydry = models.BooleanField("工作人员引导机动车入院", default=False)
    gltf = models.BooleanField("管理非机动车停放", default=False)
    tcgx = models.BooleanField("停车资源共享", default=False)
    wftc = models.BooleanField("机动车违法停车", default=False)
    fjdclf = models.BooleanField("非机动车乱停乱放", default=False)
    bz = models.TextField("备注", blank=True)
    fk = models.TextField("反馈", blank=True)

    class Meta:
        db_table = "h_dy"
        ordering = ["-dy_date"]
        verbose_name = "调研记录"
        verbose_name_plural = "调研记录"

    @property
    def h_name(self):
        return self.hospital.h_name

    @property
    def h_area(self):
        return self.hospital.h_area

    def __str__(self):
        return f"{self.hospital.h_name} {self.dy_date:%Y-%m-%d}"


class HImage(models.Model):
    CATEGORY_YDRY = "ydry"
    CATEGORY_GLTF = "gltf"
    CATEGORY_TCGX = "tcgx"
    CATEGORY_WFTC = "wftc"
    CATEGORY_FJDCLF = "fjdclf"
    CATEGORY_CHOICES = [
        (CATEGORY_YDRY, "工作人员引导机动车入院"),
        (CATEGORY_GLTF, "管理非机动车停放"),
        (CATEGORY_TCGX, "停车资源共享"),
        (CATEGORY_WFTC, "机动车违法停车"),
        (CATEGORY_FJDCLF, "非机动车乱停乱放"),
    ]

    survey = models.ForeignKey(HDy, on_delete=models.CASCADE, related_name="images")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    image_file = models.ImageField(upload_to="survey/%Y/%m/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "h_image"
        verbose_name = "调研图片"
        verbose_name_plural = "调研图片"

    def __str__(self):
        return f"{self.survey.hospital.h_name} {self.get_category_display()}"


class HZhzl(models.Model):
    TYPE_INITIAL = 1
    TYPE_FOLLOWUP = 2
    TYPE_CHOICES = [
        (TYPE_INITIAL, "首次治理"),
        (TYPE_FOLLOWUP, "复核治理"),
    ]

    hospital = models.ForeignKey(HInfo, on_delete=models.CASCADE, related_name="governance_records")
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="governance_records",
    )
    zhzl_type = models.IntegerField("治理类型", choices=TYPE_CHOICES, default=TYPE_INITIAL)
    date_time = models.DateTimeField("填报时间")
    hybl = models.FloatField("号源比例", blank=True, null=True)
    jzl = models.FloatField("预约就诊率", blank=True, null=True)
    jzsj = models.FloatField("精准就诊时间", blank=True, null=True)
    tcw = models.FloatField("停车位开放比例", blank=True, null=True)
    znxt = models.BooleanField("智能系统", default=False)
    jt = models.BooleanField("禁停标志标线", default=False)
    gj = models.BooleanField("过街设施", default=False)
    xsjs = models.BooleanField("限速减速标识", default=False)
    xr = models.BooleanField("注意行人标志", default=False)
    jp = models.BooleanField("监拍设施", default=False)
    wza = models.BooleanField("无障碍设施", default=False)

    class Meta:
        db_table = "h_zhzl"
        ordering = ["-date_time"]
        verbose_name = "综合治理填报"
        verbose_name_plural = "综合治理填报"

    @property
    def h_name(self):
        return self.hospital.h_name

    @property
    def h_area(self):
        return self.hospital.h_area

    def __str__(self):
        return f"{self.hospital.h_name} {self.date_time:%Y-%m-%d}"

    def clean(self):
        super().clean()
        percent_fields = {
            "hybl": self.hybl,
            "jzl": self.jzl,
            "tcw": self.tcw,
        }
        errors = {}
        for field_name, value in percent_fields.items():
            if value is not None and not (0 <= value <= 100):
                errors[field_name] = "比例类字段应在 0 到 100 之间"
        if self.jzsj is not None and self.jzsj < 0:
            errors["jzsj"] = "精准就诊时间不能为负数"
        if errors:
            raise ValidationError(errors)
