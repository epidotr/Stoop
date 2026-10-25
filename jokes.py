"""All the funny text lives here so it's easy to add more. Format keys like {a} get filled in by callers."""
import random

LINES = {
    "empty_map": ["No tools match. The neighborhood is suspiciously well-stocked with nothing.",
                  "Nothing here. Try a different search, or go knock on a door like it's 1985."],
    "empty_mine": ["Your shed is empty. Your neighbors are judging your drill-less lifestyle.",
                   "Nothing listed yet. Press Ctrl N and become a hero."],
    "empty_loans": ["No requests yet. Everyone is either self-sufficient or too shy.",
                    "Quiet in here. Too quiet. Somebody ask for a ladder."],
    "empty_wanted": ["Nobody needs anything. Suspicious. Post a wish, make it weird."],
    "toast_ask": ["Request sent. Now we wait, politely.", "Asked! Fingers crossed, borrow-face on."],
    "toast_add": ["Tool listed. Your neighbors have been notified by vibes.", "Added! You are now a lender. Great power, etc."],
    "toast_remove": ["Tool removed. It will be missed (by everyone but you).", "Gone! Like it was never there."],
    "toast_approve": ["Approved! Generosity looks good on you.", "Lent! The tool goes on an adventure."],
    "toast_decline": ["Declined. Firm but fair.", "Nope sent. Gently, we hope."],
    "toast_return": ["Returned! Faith in humanity: restored.", "Back home safe. Heartwarming."],
    "toast_nudge": ["Nudge sent. Very polite. Very passive-aggressive.", "Gentle reminder delivered, with love and a raised eyebrow."],
    "toast_wish": ["Wish posted to the Wanted board.", "Posted! May a neighbor with a garage hear you."],
    "toast_grant": ["You're a wish granter. Cape sold separately.", "Offered! Someone is about to be very happy."],
    "toast_wave": ["You waved.", "Wave sent. Social contract fulfilled."],
    "loading": ["Untangling extension cords...", "Looking for the 10mm socket...", "Asking Dev about the ladder...",
                "Borrowing a cup of sugar...", "Returning things on time (aspirational)..."],
    "dots": ["Nice weather for returning stuff.", "Has anyone seen my ladder?", "I only came out for a screwdriver.",
             "I'm not lost, I'm exploring.", "Who borrowed my wheelbarrow?!", "Just walking. Definitely not casing your shed.",
             "Is it Tuesday?", "I have a drill and no hobbies.", "Hot take: sanders beat saws.", "*waves awkwardly*"],
    "wish_hint": ["a 10mm socket", "a pasta roller", "a very tall ladder", "someone who knows about gutters", "a cake pan shaped like a duck"],
}

HEADLINES = {  # Gazette headlines, keyed by what happened
    "add": ["{a} lists a {t}. Neighbors lose their minds.", "BREAKING: {a} now owns a {t} publicly.", "{a} adds a {t} to the Stoop. Savage generosity."],
    "remove": ["{a} pulls the {t} off the market. Rumors swirl.", "The {t} is gone from the Stoop. {a} says 'no comment'."],
    "ask": ["{a} asks {b} for the {t}. Bold move.", "{a} has eyes on {b}'s {t}.", "{a} would like to borrow the {t}. Please clap."],
    "approve": ["{b} lets {a} borrow the {t}. Trust has been established.", "{a} walks away with the {t}. {b} watches nervously."],
    "decline": ["{b} says no to {a} about the {t}. Oof.", "{a}'s request for the {t} is declined. Hearts break."],
    "return": ["{a} returns the {t} to {b}. Unbelievably, on time-ish.", "The {t} is home again. {b} sheds a single tear."],
    "nudge": ["{b} politely nudges {a} about the {t}. Sources say it was not that polite.", "{b} is 'just checking in' on the {t}. {a} is sweating."],
    "wish": ["{a} is looking for {t}. Anyone? Anyone?", "WANTED: {t}. Posted by {a}, who is not desperate."],
    "grant": ["{b} says they have {t} for {a}. A hero emerges.", "{b} answers {a}'s call for {t}. Cue the music."],
    "wave": ["{a} waved at {b}. {b} {r}", "{a} waves at {b}. {b} {r}"],
}

WAVE_REACTIONS = ["waved back. Whole street saw it.", "pretended to check their phone.", "did a tiny salute.",
                  "waved with the wrong hand. Awkward.", "yelled 'HEY!' from far too far away."]

GOSSIP = [  # filler so the Gazette feels alive even when nobody is doing anything
    "{a} was seen carrying a ladder. Nobody knows where it was going.", "A raccoon has been spotted near {b}'s shed. Nobody is surprised.",
    "{a} and {b} had a lengthy conversation about drill bits. Riveting.", "Local weather: 72 and tool-friendly.",
    "{b} says the leaf blower was 'already like that' when it came back.", "Someone has been returning screwdrivers in the wrong drawer. We know who.",
    "{a} is rumored to have a secret second wheelbarrow.", "Stoop update: the street is, once again, fine.",
    "A sander was mistaken for a hairdryer on Maple Ave. No injuries, many opinions.", "{b} bakes. {a} borrowed the stand mixer. Coincidence? No.",
]

def pick(key):
    return random.choice(LINES[key])

def headline(kind, **kw):
    kw.setdefault("a", "Someone"); kw.setdefault("b", "somebody"); kw.setdefault("t", "thing"); kw.setdefault("r", "")
    return random.choice(HEADLINES[kind]).format(**kw)

def shame(days_late):
    """Overdue text, escalating with how late it is."""
    if days_late <= 0:
        return ""
    if days_late == 1:
        return "1 day late. Could be traffic."
    if days_late <= 3:
        return f"{days_late} days late. The tool is starting to feel abandoned."
    if days_late <= 7:
        return f"{days_late} days late. The owner has started staring out the window."
    return f"{days_late} days late. At this point it's a long-term lease."
