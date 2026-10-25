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
    days = models.PositiveSmallIntegerField(default=7)      # how long the borrower asked to keep it
    due = models.DateTimeField(null=True, blank=True)       # set when the owner approves
    returned_at = models.DateTimeField(null=True, blank=True)

    def late_days(self, now=None):
        """0 unless the tool is out and past due; then 1, 2, 3... (any part of a day late counts)."""
        now = now or timezone.now()
        if self.status != "approved" or not self.due or now <= self.due:
            return 0
        return int((now - self.due).total_seconds() // 86400) + 1

class Event(models.Model):
    """Town Gazette feed: everything that happens gets a (hopefully funny) headline."""
    kind = models.CharField(max_length=20, default="gossip")
    text = models.CharField(max_length=240)
    created = models.DateTimeField(default=timezone.now)

class Wish(models.Model):
    """Wanted board: 'I need a ___'. Any other neighbor can say they've got one."""
    author = models.ForeignKey(Neighbor, on_delete=models.CASCADE, related_name="wishes")
    text = models.CharField(max_length=120)
    created = models.DateTimeField(default=timezone.now)
    granted_by = models.ForeignKey(Neighbor, null=True, blank=True, on_delete=models.SET_NULL, related_name="granted")
