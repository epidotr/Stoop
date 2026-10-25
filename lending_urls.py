# Lives at lending/urls.py in the package layout (the zip didn't include it, so it's rebuilt from app.js + views.py).
from django.urls import path
from . import views, views_extra as x

urlpatterns = [
    path("", views.index),
    path("api/state", views.state),
    path("api/me", views.switch_me),
    path("api/tools", views.add_tool),
    path("api/tools/<int:pk>/delete", views.delete_tool),
    path("api/tools/<int:pk>/request", views.request_loan),
    path("api/loans/<int:pk>/<str:action>", views.loan_action),
    path("api/gazette", x.gazette_feed),
    path("api/wave", x.wave),
]
