from django.contrib import admin
from .models import Neighbor, Tool, Loan
admin.site.register([Neighbor, Tool, Loan])
