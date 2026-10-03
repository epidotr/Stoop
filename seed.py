import random
from datetime import timedelta
from django.utils import timezone
from .models import Neighbor, Tool, Loan, AppState

INTERVAL = timedelta(days=7)
POOL = [  # tools that can show up in the neighborhood over time: (name, category, notes)
    ("Hedge trimmer", "Garden", "Electric, 55 cm blade."),
    ("Pressure washer", "Garden", "Good for decks and driveways."),
    ("Stand mixer", "Kitchen", "Five-quart bowl, dough hook."),
    ("Circular saw", "Power tools", "7.25 inch blade, spare blade included."),
    ("Wheelbarrow", "Garden", "Pneumatic tire, 6 cu ft."),
    ("Pasta drying rack", "Kitchen", "Folds flat."),
    ("Shop vac", "Power tools", "12 gallon, wet and dry."),
    ("Folding tables (2)", "Other", "6 ft, seat eight each."),
    ("Stud finder", "Other", "Detects wood and live wires."),
    ("Dutch oven", "Kitchen", "Enameled cast iron, 6 qt."),
    ("Post hole digger", "Garden", "Manual, long handles."),
    ("Random orbital sander", "Power tools", "Dust bag included."),
]

def get_state():
    return AppState.objects.get_or_create(pk=1, defaults={"last_tool_added": timezone.now()})[0]

def tick():
    """Add one neighbor tool per full 7 days of system time since the last one (catches up if the app was closed)."""
    st, now = get_state(), timezone.now()
    others = list(Neighbor.objects.filter(is_me=False))
    while others and st.last_tool_added + INTERVAL <= now:
        have = set(Tool.objects.values_list("name", flat=True))
        fresh = [p for p in POOL if p[0] not in have]
        if not fresh:
            break
        name, cat, desc = random.choice(fresh)
        Tool.objects.create(owner=random.choice(others), name=name, category=cat, description=desc)
        st.last_tool_added += INTERVAL
    st.save()

def ensure_seed():
    if Neighbor.objects.exists():
        return
    get_state()
    sam = Neighbor.objects.create(name="Sam (you)", street="Maple Ave", x=48, y=50, is_me=True)
    maya = Neighbor.objects.create(name="Maya", street="Maple Ave", x=58, y=46)
    dev = Neighbor.objects.create(name="Dev", street="Oak St", x=22, y=72)
    rosa = Neighbor.objects.create(name="Rosa", street="Elm Ct", x=80, y=70)
    jonah = Neighbor.objects.create(name="Jonah", street="Oak St", x=20, y=18)
    Tool.objects.create(owner=sam, name="Orbital sander", category="Power tools", description="Comes with 10 sheets of 120 grit.")
    Tool.objects.create(owner=maya, name="Cordless drill", category="Power tools", description="18V, two batteries, bit set.")
    ladder = Tool.objects.create(owner=dev, name="Extension ladder", category="Garden", description="24 ft, aluminium.")
    Tool.objects.create(owner=rosa, name="Wet tile saw", category="Power tools", description="Blade included, bring your own water.")
    Tool.objects.create(owner=jonah, name="Pasta maker", category="Kitchen", description="Hand crank, three cutters.")
    Loan.objects.create(tool=ladder, borrower=maya, status="approved", message="Gutters this weekend")
