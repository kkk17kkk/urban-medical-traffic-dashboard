from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="HInfo",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("h_name", models.CharField(max_length=100, unique=True, verbose_name="医院名称")),
                ("h_area", models.CharField(max_length=50, verbose_name="区属")),
                ("h_type", models.CharField(max_length=50, verbose_name="医院类型")),
                ("h_lng", models.FloatField(verbose_name="经度")),
                ("h_lat", models.FloatField(verbose_name="纬度")),
                ("is_active", models.BooleanField(default=True, verbose_name="启用")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "医院",
                "verbose_name_plural": "医院",
                "db_table": "h_info",
                "ordering": ["id"],
            },
        ),
        migrations.CreateModel(
            name="HDy",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("dy_date", models.DateTimeField(verbose_name="调研时间")),
                ("ydry", models.BooleanField(default=False, verbose_name="工作人员引导机动车入院")),
                ("gltf", models.BooleanField(default=False, verbose_name="管理非机动车停放")),
                ("tcgx", models.BooleanField(default=False, verbose_name="停车资源共享")),
                ("wftc", models.BooleanField(default=False, verbose_name="机动车违法停车")),
                ("fjdclf", models.BooleanField(default=False, verbose_name="非机动车乱停乱放")),
                ("bz", models.TextField(blank=True, verbose_name="备注")),
                ("fk", models.TextField(blank=True, verbose_name="反馈")),
                ("hospital", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="surveys", to="hospital.hinfo")),
                ("surveyor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="surveys", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "调研记录",
                "verbose_name_plural": "调研记录",
                "db_table": "h_dy",
                "ordering": ["-dy_date"],
            },
        ),
        migrations.CreateModel(
            name="HImage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("category", models.CharField(choices=[("ydry", "工作人员引导机动车入院"), ("gltf", "管理非机动车停放"), ("tcgx", "停车资源共享"), ("wftc", "机动车违法停车"), ("fjdclf", "非机动车乱停乱放")], max_length=20)),
                ("image_file", models.ImageField(upload_to="survey/%Y/%m/")),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                ("survey", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="images", to="hospital.hdy")),
            ],
            options={
                "verbose_name": "调研图片",
                "verbose_name_plural": "调研图片",
                "db_table": "h_image",
            },
        ),
        migrations.CreateModel(
            name="HScore",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("test_time", models.DateTimeField(verbose_name="评分时间")),
                ("hybl_s1", models.FloatField(default=0)),
                ("jzl_s1", models.FloatField(default=0)),
                ("jzsj_s1", models.FloatField(default=0)),
                ("tcw_s1", models.FloatField(default=0)),
                ("jt_s2", models.FloatField(default=0)),
                ("gj_s2", models.FloatField(default=0)),
                ("xsjs_s2", models.FloatField(default=0)),
                ("xr_s2", models.FloatField(default=0)),
                ("jp_s2", models.FloatField(default=0)),
                ("ydry_s3", models.FloatField(default=0)),
                ("gltf_s3", models.FloatField(default=0)),
                ("tcgx_s4", models.FloatField(default=0)),
                ("wftc_s4", models.FloatField(default=0)),
                ("fjdclf_s4", models.FloatField(default=0)),
                ("sbjs_s5", models.FloatField(default=0)),
                ("phdy_s5", models.FloatField(default=0)),
                ("s1_score", models.FloatField(default=0)),
                ("s2_score", models.FloatField(default=0)),
                ("s3_score", models.FloatField(default=0)),
                ("s4_score", models.FloatField(default=0)),
                ("s5_score", models.FloatField(default=0)),
                ("sum_score", models.FloatField(default=0)),
                ("hospital", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="scores", to="hospital.hinfo")),
            ],
            options={
                "verbose_name": "评分",
                "verbose_name_plural": "评分",
                "db_table": "h_score",
                "ordering": ["-sum_score", "hospital__h_area", "hospital__h_name"],
            },
        ),
        migrations.CreateModel(
            name="HZhzl",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("zhzl_type", models.IntegerField(choices=[(1, "首次治理"), (2, "复核治理")], default=1, verbose_name="治理类型")),
                ("date_time", models.DateTimeField(verbose_name="填报时间")),
                ("hybl", models.FloatField(blank=True, null=True, verbose_name="号源比例")),
                ("jzl", models.FloatField(blank=True, null=True, verbose_name="预约就诊率")),
                ("jzsj", models.FloatField(blank=True, null=True, verbose_name="精准就诊时间")),
                ("tcw", models.FloatField(blank=True, null=True, verbose_name="停车位开放比例")),
                ("znxt", models.BooleanField(default=False, verbose_name="智能系统")),
                ("jt", models.BooleanField(default=False, verbose_name="禁停标志标线")),
                ("gj", models.BooleanField(default=False, verbose_name="过街设施")),
                ("xsjs", models.BooleanField(default=False, verbose_name="限速减速标识")),
                ("xr", models.BooleanField(default=False, verbose_name="注意行人标志")),
                ("jp", models.BooleanField(default=False, verbose_name="监拍设施")),
                ("wza", models.BooleanField(default=False, verbose_name="无障碍设施")),
                ("hospital", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="governance_records", to="hospital.hinfo")),
                ("reporter", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="governance_records", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "综合治理填报",
                "verbose_name_plural": "综合治理填报",
                "db_table": "h_zhzl",
                "ordering": ["-date_time"],
            },
        ),
        migrations.CreateModel(
            name="UserProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(choices=[("admin", "管理员"), ("surveyor", "调研员"), ("hospital", "医院用户")], max_length=20)),
                ("hospital", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="users", to="hospital.hinfo")),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="profile", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "用户资料",
                "verbose_name_plural": "用户资料",
                "db_table": "user_profile",
            },
        ),
        migrations.AddIndex(
            model_name="hscore",
            index=models.Index(fields=["hospital", "test_time"], name="h_score_hospita_1f3626_idx"),
        ),
    ]
