import random
from datetime import timedelta
from django.utils import timezone
from . import jokes
from .models import Event, Neighbor

KEEP = 200  # old headlines get recycled so the table stays tiny

def log(kind, text):
    Event.objects.create(kind=kind, text=text[:240])
    old = Event.objects.order_by("-id").values_list("id", flat=True)[KEEP:]
    if old:
        Event.objects.filter(id__in=list(old)).delete()

def maybe_gossip():
    """Called on every poll: if it's been quiet for a while, make something up (rate-limited, so it's cheap)."""
    last = Event.objects.order_by("-id").first()
    if last and timezone.now() - last.created < timedelta(seconds=25) or random.random() > 0.6:
        return
    names = list(Neighbor.objects.values_list("name", flat=True)) or ["Somebody"]
    log("gossip", random.choice(jokes.GOSSIP).format(a=random.choice(names).replace(" (you)", ""), b=random.choice(names).replace(" (you)", "")))

def feed(since=0, limit=40):
    maybe_gossip()
    qs = Event.objects.filter(id__gt=since).order_by("-id")[:limit]
    return [{"id": e.id, "kind": e.kind, "text": e.text, "created": e.created.isoformat()} for e in qs]
