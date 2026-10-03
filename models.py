from django.db import models
from django.utils import timezone

class Neighbor(models.Model):
    name = models.CharField(max_length=60)
    street = models.CharField(max_length=60)
    x = models.FloatField()  # map position, 0-100
    y = models.FloatField()
    is_me = models.BooleanField(default=False)  # draft: one local "acting as" user

    def miles_to(self, other):
        return ((self.x - other.x) ** 2 + (self.y - other.y) ** 2) ** 0.5 * 0.01

    def __str__(self):
        return self.name

class Tool(models.Model):
    owner = models.ForeignKey(Neighbor, on_delete=models.CASCADE, related_name="tools")
    name = models.CharField(max_length=80)
    category = models.CharField(max_length=30, default="Power tools")
    description = models.TextField(blank=True)
    created = models.DateTimeField(default=timezone.now)

class AppState(models.Model):
    """Single row: the local database doubles as the "server"."""
    last_tool_added = models.DateTimeField(default=timezone.now)

class Loan(models.Model):
    STATUSES = [("requested", "Requested"), ("approved", "Approved"), ("declined", "Declined"), ("returned", "Returned")]
    tool = models.ForeignKey(Tool, on_delete=models.CASCADE, related_name="loans")
    borrower = models.ForeignKey(Neighbor, on_delete=models.CASCADE, related_name="loans")
    status = models.CharField(max_length=10, choices=STATUSES, default="requested")
    message = models.CharField(max_length=240, blank=True)
    created = models.DateTimeField(auto_now_add=True)
