"""Newer endpoints live here so views.py stays close to the original draft."""
import random
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from . import jokes, gazette
from .models import Neighbor
from .views import _me, _body, _short

def gazette_feed(request):
    try:
        since = int(request.GET.get("since", 0))
    except ValueError:
        since = 0
    return JsonResponse({"events": gazette.feed(since)})

@require_POST
def wave(request):
    me, other = _me(), Neighbor.objects.filter(pk=_body(request).get("id")).first()
    if not other or other.pk == me.pk:
        return JsonResponse({"error": "Waving at yourself is a different app."}, status=400)
    line = jokes.headline("wave", a=_short(me), b=_short(other), r=random.choice(jokes.WAVE_REACTIONS))
    gazette.log("wave", line)
    return JsonResponse({"line": line})
