"""Newer endpoints live here so views.py stays close to the original draft."""
import random
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from . import jokes, gazette, awards
from .models import Neighbor
from .views import _me, _body, _short

def gazette_feed(request):
    try:
        since = int(request.GET.get("since", 0))
    except ValueError:
        since = 0
    return JsonResponse({"events": gazette.feed(since)})

def fame(request):
    return JsonResponse({"rows": awards.standings()})

@require_POST
def wave(request):
    me, other = _me(), Neighbor.objects.filter(pk=_body(request).get("id")).first()
    if not other or other.pk == me.pk:
        return JsonResponse({"error": "Waving at yourself is a different app."}, status=400)
    line = jokes.headline("wave", a=_short(me), b=_short(other), r=random.choice(jokes.WAVE_REACTIONS))
    gazette.log("wave", line)
    return JsonResponse({"line": line})


# ---------- Wanted board ----------
from .models import Wish

def wishes(request):
    me = _me()
    rows = [{"id": w.id, "author": _short(w.author), "text": w.text, "created": w.created.isoformat(),
             "granted_by": _short(w.granted_by) if w.granted_by else None,
             "mine": w.author_id == me.id, "can_grant": w.author_id != me.id and not w.granted_by_id}
            for w in Wish.objects.select_related("author", "granted_by").order_by("-id")]
    rows.sort(key=lambda r: r["granted_by"] is not None)   # open wishes first (stable, so newest first inside each group)
    return JsonResponse({"wishes": rows})

@require_POST
def add_wish(request):
    text = (_body(request).get("text") or "").strip()[:120]
    if not text:
        return JsonResponse({"error": "A wish needs words."}, status=400)
    me = _me()
    Wish.objects.create(author=me, text=text)
    gazette.log("wish", jokes.headline("wish", a=_short(me), t=text))
    return JsonResponse({"ok": True})

@require_POST
def grant_wish(request, pk):
    me, w = _me(), Wish.objects.select_related("author").filter(pk=pk).first()
    if w and w.author_id != me.id and not w.granted_by_id:
        w.granted_by = me
        w.save()
        gazette.log("grant", jokes.headline("grant", a=_short(w.author), b=_short(me), t=w.text))
    return JsonResponse({"ok": True})

@require_POST
def delete_wish(request, pk):
    Wish.objects.filter(pk=pk, author=_me()).delete()
    return JsonResponse({"ok": True})
