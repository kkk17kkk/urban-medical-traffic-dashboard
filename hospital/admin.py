from django.contrib import admin

from .models import HDy, HImage, HInfo, HScore, HZhzl, UserProfile


@admin.register(HInfo)
class HInfoAdmin(admin.ModelAdmin):
    list_display = ("id", "h_name", "h_area", "h_type", "is_active")
    list_filter = ("h_area", "h_type", "is_active")
    search_fields = ("h_name",)


@admin.register(HScore)
class HScoreAdmin(admin.ModelAdmin):
    list_display = ("hospital", "test_time", "sum_score", "s1_score", "s2_score", "s3_score", "s4_score", "s5_score")
    list_filter = ("hospital__h_area", "test_time")
    search_fields = ("hospital__h_name",)


@admin.register(HDy)
class HDyAdmin(admin.ModelAdmin):
    list_display = ("hospital", "surveyor", "dy_date", "ydry", "gltf", "tcgx", "wftc", "fjdclf")
    list_filter = ("hospital__h_area", "dy_date")
    search_fields = ("hospital__h_name", "bz")


@admin.register(HImage)
class HImageAdmin(admin.ModelAdmin):
    list_display = ("survey", "category", "uploaded_at")
    list_filter = ("category", "uploaded_at")


@admin.register(HZhzl)
class HZhzlAdmin(admin.ModelAdmin):
    list_display = ("hospital", "reporter", "zhzl_type", "date_time")
    list_filter = ("zhzl_type", "hospital__h_area", "date_time")
    search_fields = ("hospital__h_name",)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "hospital")
    list_filter = ("role",)
    search_fields = ("user__username", "hospital__h_name")
