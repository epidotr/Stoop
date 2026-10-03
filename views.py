import json
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST
from .models import Neighbor, Tool, Loan
from .seed import ensure_seed, tick, get_state, INTERVAL

def _me():
    return Neighbor.objects.filter(is_me=True).first()

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
    } for l in Loan.objects.select_related("tool__owner", "borrower").order_by("-created")
        if l.tool.owner_id == me.id or l.borrower_id == me.id]
    return JsonResponse({
        "me": {"id": me.id, "name": me.name, "x": me.x, "y": me.y},
        "neighbors": [{"id": n.id, "name": n.name} for n in Neighbor.objects.all()],
        "tools": tools, "loans": loans,
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
    Tool.objects.create(owner=_me(), name=name[:80], category=d.get("category") or "Power tools",
                        description=(d.get("description") or "")[:500])
    return JsonResponse({"ok": True})

@require_POST
def delete_tool(request, pk):
    Tool.objects.filter(pk=pk, owner=_me()).delete()
    return JsonResponse({"ok": True})

@require_POST
def request_loan(request, pk):
    me, tool = _me(), Tool.objects.get(pk=pk)
    if tool.owner_id != me.id and not tool.loans.filter(borrower=me, status__in=["requested", "approved"]).exists():
        Loan.objects.create(tool=tool, borrower=me, message=(_body(request).get("message") or "")[:240])
    return JsonResponse({"ok": True})

@require_POST
def loan_action(request, pk, action):
    me, loan = _me(), Loan.objects.select_related("tool").get(pk=pk)
    if loan.tool.owner_id == me.id:
        if action == "approve" and loan.status == "requested" and not loan.tool.loans.filter(status="approved").exists():
            loan.status = "approved"
        elif action == "decline" and loan.status == "requested":
            loan.status = "declined"
        elif action == "return" and loan.status == "approved":
            loan.status = "returned"
        loan.save()
    return JsonResponse({"ok": True})
