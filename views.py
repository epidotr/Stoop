import json
from datetime import timedelta
from django.utils import timezone
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST
from .models import Neighbor, Tool, Loan
from . import jokes, gazette
from .seed import ensure_seed, tick, get_state, INTERVAL

def _me():
    return Neighbor.objects.filter(is_me=True).first()

def _short(n):
    return n.name.replace(" (you)", "")

def _body(request):
    try:
        return json.loads(request.body or b"{}")
    except ValueError:
        return {}

@ensure_csrf_cookie
def index(request):
    ensure_seed()
    return render(request, "lending/index.html")

def state(request):
    ensure_seed()
    tick()
    me = _me()
    tools = []
    for t in Tool.objects.select_related("owner").order_by("id"):
        tools.append({
            "id": t.id, "name": t.name, "category": t.category, "description": t.description,
            "owner": t.owner.name, "street": t.owner.street, "x": t.owner.x, "y": t.owner.y,
            "distance": round(me.miles_to(t.owner), 2), "mine": t.owner_id == me.id,
            "status": "out" if t.loans.filter(status="approved").exists() else "free",
            "asked": t.loans.filter(borrower=me, status__in=["requested", "approved"]).exists(),
        })
    loans = [{
        "id": l.id, "tool": l.tool.name, "owner": l.tool.owner.name, "borrower": l.borrower.name,
        "status": l.status, "message": l.message, "incoming": l.tool.owner_id == me.id,
        "days": l.days, "due": l.due.isoformat() if l.due else None,
        "late_days": l.late_days(), "shame": jokes.shame(l.late_days()),
    } for l in Loan.objects.select_related("tool__owner", "borrower").order_by("-created")
        if l.tool.owner_id == me.id or l.borrower_id == me.id]
    return JsonResponse({
        "me": {"id": me.id, "name": me.name, "x": me.x, "y": me.y},
        "neighbors": [{"id": n.id, "name": n.name, "street": n.street, "x": n.x, "y": n.y} for n in Neighbor.objects.all()],
        "tools": tools, "loans": loans, "quips": jokes.LINES,
        "next_tool_at": (get_state().last_tool_added + INTERVAL).isoformat(),
    })

@require_POST
def switch_me(request):
    pk = _body(request).get("id")
    Neighbor.objects.update(is_me=False)
    Neighbor.objects.filter(pk=pk).update(is_me=True)
    return JsonResponse({"ok": True})

@require_POST
def add_tool(request):
    d = _body(request)
    name = (d.get("name") or "").strip()
    if not name:
        return JsonResponse({"error": "Name is required"}, status=400)
    me = _me()
    Tool.objects.create(owner=me, name=name[:80], category=d.get("category") or "Power tools",
                        description=(d.get("description") or "")[:500])
    gazette.log("add", jokes.headline("add", a=_short(me), t=name[:80]))
    return JsonResponse({"ok": True})

@require_POST
def delete_tool(request, pk):
    me = _me()
    tool = Tool.objects.filter(pk=pk, owner=me).first()
    if tool:
        gazette.log("remove", jokes.headline("remove", a=_short(me), t=tool.name))
        tool.delete()
    return JsonResponse({"ok": True})

@require_POST
def request_loan(request, pk):
    me, tool = _me(), Tool.objects.get(pk=pk)
    if tool.owner_id != me.id and not tool.loans.filter(borrower=me, status__in=["requested", "approved"]).exists():
        d = _body(request)
        try:
            days = min(30, max(1, int(d.get("days") or 7)))
        except (TypeError, ValueError):
            days = 7
        Loan.objects.create(tool=tool, borrower=me, days=days, message=(d.get("message") or "")[:240])
        gazette.log("ask", jokes.headline("ask", a=_short(me), b=_short(tool.owner), t=tool.name))
    return JsonResponse({"ok": True})

@require_POST
def loan_action(request, pk, action):
    me, loan = _me(), Loan.objects.select_related("tool").get(pk=pk)
    if loan.tool.owner_id == me.id:
        if action == "approve" and loan.status == "requested" and not loan.tool.loans.filter(status="approved").exists():
            loan.status = "approved"
            loan.due = timezone.now() + timedelta(days=loan.days)
            _news("approve", loan)
        elif action == "decline" and loan.status == "requested":
            loan.status = "declined"
            _news("decline", loan)
        elif action == "return" and loan.status == "approved":
            loan.status = "returned"
            loan.returned_at = timezone.now()
            _news("return", loan)
        elif action == "nudge" and loan.status == "approved":
            _news("nudge", loan)
        loan.save()
    return JsonResponse({"ok": True})

def _news(kind, loan):
    gazette.log(kind, jokes.headline(kind, a=_short(loan.borrower), b=_short(loan.tool.owner), t=loan.tool.name))
