"""Hall of Fame: karma points and silly badges, computed fresh from loans/tools/wishes (nothing stored)."""
from django.utils import timezone
from .models import Neighbor, Loan

TITLES = [(20, "Neighborhood Legend"), (10, "Pillar of the Street"), (3, "Decent Human"), (0, "Mysterious Stranger")]

def _title(karma):
    return next((t for floor, t in TITLES if karma >= floor), "Who Dis?")

def standings():
    now, rows = timezone.now(), []
    for n in Neighbor.objects.all():
        lent = Loan.objects.filter(tool__owner=n, status__in=["approved", "returned"]).count()
        out = list(Loan.objects.filter(borrower=n, status__in=["approved", "returned"]))
        on_time = late = 0
        for l in out:
            if l.status == "returned":
                if l.due and l.returned_at and l.returned_at > l.due:
                    late += 1
                else:
                    on_time += 1
            elif l.late_days(now):
                late += 1          # still out and overdue counts against you
        rows.append({"id": n.id, "name": n.name.replace(" (you)", ""), "street": n.street, "is_me": n.is_me,
                     "lent": lent, "borrowed": len(out), "late": late, "on_time": on_time,
                     "tools": n.tools.count(), "granted": n.granted.count(), "badges": []})
    for r in rows:
        r["karma"] = r["lent"] * 5 + r["on_time"] * 3 - r["late"] * 4 + r["tools"] + r["granted"] * 4
        r["title"] = _title(r["karma"])

    def crown(key, icon, title, minimum=1):
        top = max((r[key] for r in rows), default=0)
        if top >= minimum:
            for r in rows:
                if r[key] == top:
                    r["badges"].append({"icon": icon, "title": title})

    crown("lent", "🏆", "The Lendlord")
    crown("tools", "🧰", "Tool Hoarder", 2)
    crown("borrowed", "🧲", "Borrow Goblin", 2)
    crown("granted", "🦸", "Wish Granter")
    crown("on_time", "⏰", "Mr. Punctual")
    crown("late", "🐌", "Overdue Gremlin")
    rows.sort(key=lambda r: (-r["karma"], r["name"]))
    for i, r in enumerate(rows):
        r["rank"] = i + 1
    return rows
