from django.urls import path
from .views import DetectErrorView

urlpatterns = [
    path('detect-error/', DetectErrorView.as_view(), name='detect-error'),
]
