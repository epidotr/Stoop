from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = "dev-only-local-desktop-app"
DEBUG = True
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]
INSTALLED_APPS = ["django.contrib.staticfiles", "lending"]
MIDDLEWARE = ["django.middleware.common.CommonMiddleware", "django.middleware.csrf.CsrfViewMiddleware"]
ROOT_URLCONF = "stoop_project.urls"
TEMPLATES = [{"BACKEND": "django.template.backends.django.DjangoTemplates", "APP_DIRS": True,
              "OPTIONS": {"context_processors": ["django.template.context_processors.request"]}}]
WSGI_APPLICATION = "stoop_project.wsgi.application"
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "stoop.sqlite3"}}
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
