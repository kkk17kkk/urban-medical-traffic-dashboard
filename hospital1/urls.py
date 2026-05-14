"""hospital1 URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path

from hospital import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.index, name='index'),
    path('login/', views.index, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('change_password/', views.change_password, name='change_password'),

    path('hospital/scanboard/', views.scanboard, name='scanboard'),
    path('yygl/', views.yygl, name='yygl'),
    path('hospital_search/', views.hospital_search, name='hospital_search'),
    path('add_hospital/', views.add_hospital, name='add_hospital'),
    path('delete/<int:hospital_id>/', views.delete_hospital, name='delete_hospital'),
    path('get_hospital_info/<int:hospital_id>/', views.get_hospital_info, name='get_hospital_info'),
    path('update_hospital/', views.update_hospital, name='update_hospital'),

    path('dybtj/', views.dybtj, name='dybtj'),
    path('add_dyb/', views.add_dyb, name='add_dyb'),
    path('get_hospitals_by_area/', views.get_hospitals_by_area, name='get_hospitals_by_area'),
    path("zhzl/", views.v_zhzl, name="zhzl"),
    path("api/dashboard/", views.dashboard_data, name="dashboard_data"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

