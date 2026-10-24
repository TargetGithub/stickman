#!/usr/bin/env python3
"""Generator for Baaaana "Picnic Day" (series/baaaana/IDEAS.md idea 1): seven standalone v3 scripts, one per part,
written to scripts/series/baaaana/picnic_day/. Run from the repo root."""
import json, os

OUT = "scripts/series/baaaana/picnic_day"
LEADS = ["bobo", "bn_mooka", "tutu", "zizi"]
C = "baaaana_crowd"
PUSH = 1.4  # lens push for meadow and hill scenes (Sridhar 2026-10-24: leads too small in the review render)


def cast():
    out = []
    for i in LEADS:
        p = json.load(open(f"catalog/characters/presets/{i}.json"))
        out.append({"id": i, "name": p["name"], **p["cast"]})
    return out


class Scene:
    """Beats chained one after another unless `at` is given; `w(...)` starts with the previous beat."""
    def __init__(self, sid, location, cast, **kw):
        self.id = sid
        self.s = {"id": sid, "location": location, "time": "day", "light": "noon", "music": {"mood": "bouncy", "volume": 0.28}, "cast": cast, "beats": [], **kw}
        # Meadow and hill scenes: the calm camera fits everyone who moves, crowds included, so push in to keep the leads big.
        if location in ("meadow", "hill") and "lens" not in kw:
            self.s["lens"] = {"push": PUSH}
        self.n = 0
        self.last = None

    def _id(self):
        self.n += 1
        return f"{self.id}_{self.n}"

    def b(self, who, do, at=None, delay=0.0, **kw):
        bid = self._id()
        if at is None:
            at = {"after": self.last, "delay": delay} if self.last else 0.5
        beat = {"id": bid, "at": at, "who": who, "do": do, **kw}
        self.s["beats"].append(beat)
        self.last = bid
        return bid

    def w(self, who, do, delay=0.0, **kw):
        """With the previous beat (does not move the chain)."""
        bid = self._id()
        beat = {"id": bid, "at": {"with": self.last, "delay": delay}, "who": who, "do": do, **kw}
        self.s["beats"].append(beat)
        return bid

    def m(self, macro, params, delay=0.0, at=None):
        bid = self._id()
        if at is None:
            at = {"after": self.last, "delay": delay} if self.last else 0.5
        self.s["beats"].append({"id": bid, "at": at, "macro": macro, "params": params})
        self.last = bid
        return bid

    def world(self, do, params, delay=0.0, chain=False, **kw):
        bid = self._id()
        at = {"with": self.last, "delay": delay} if self.last else 0.3
        beat = {"id": bid, "at": at, "who": "world", "do": do, "params": params, **kw}
        self.s["beats"].append(beat)
        if chain:
            self.last = bid
        return bid

    def say(self, lines, delay=0.3):
        return self.m("dialogue", {"lines": lines}, delay=delay)

    def done(self):
        return self.s


def place(*pairs, **kw):
    return [{"id": i, "x": x, **kw} for i, x in pairs]


def script(part, title, scenes, locations):
    return {
        "version": 3,
        "meta": {"title": f"Baaaana: Picnic Day ({title})", "format": "landscape", "seed": 3100 + part, "kind": "story", "audience": "general",
                 "autoCamera": "story", "style": "soft", "speakerNames": False},
        "look": {"strength": 0.45},
        "motion": {"followThrough": 1, "squash": 1, "secondary": 1, "breathing": 1, "blur": 0},
        "pace": {"travel": {"walk": 2.0, "run": 1.3, "sneak": 1.8, "tiptoe": 1.6, "walk_together": 1.8}, "moves": 1, "gap": 0.4, "maxTravel": 4.5,
                 "arrive": 1.6, "leave": 1.2, "shot": [4, 8], "minCut": 2.5, "reactions": False, "glide": 1.2, "framing": "calm", "establish": 3},
        "audio": {"musicVolume": 0.3},
        "locations": locations,
        "cast": cast(),
        "scenes": scenes,
    }


MEADOW = {"id": "meadow", "theme": "baaaana_meadow", "stageWidth": 3600,
          "set": [{"id": "hut", "object": "mushroom_hut", "x": 700, "z": -260}, {"id": "hut2", "object": "mushroom_hut", "x": 2900, "z": -420}, {"id": "bench", "object": "bench", "x": 2300, "z": -40}]}
ROAD = {"id": "road", "theme": "baaaana_meadow", "stageWidth": 3600}
HILL = {"id": "hill", "theme": "baaaana_meadow", "stageWidth": 3600,
        "set": [{"id": "tower", "object": "lookout_tower", "x": 2500}, {"id": "blanket", "object": "picnic_blanket", "x": 1500, "z": -60}, {"id": "tripod", "object": "camera_tripod", "x": 3000, "z": 60},
                {"id": "cake", "object": "cake", "x": 1520, "z": -70}, {"id": "wall", "object": "garden_wall", "x": 900, "z": -200}]}


# ---- Part 0: cold open -------------------------------------------------------------------------------------------
def cold_open():
    a = Scene("lineup", "meadow", place(("bobo", 1500), ("bn_mooka", 2300)),
              extras=[{"count": 24, "behavior": "copy_leader", "leader": "bobo", "crowd": C, "from": 700, "to": 2700, "layer": "back"}])
    a.b("world", "set_camera", at=0, params={"move": "slow_push", "dur": 6})
    a.b("bobo", "talk", at=1.0, say="Baaaana! Line-up!", bubble="shout", face="determined", view="front")
    a.b("bobo", "point", delay=0.3, face="smug")
    a.b("bobo", "flex", delay=0.4, face="happy", view="front")
    a.b("bobo", "nod", delay=0.3, face="happy")
    a.b("bobo", "talk", delay=0.3, say="Ooh! Perfect!", face="love")
    a.b("bobo", "bow", delay=0.2, face="happy")
    a.b("bobo", "walk", to={"x": 1000}, delay=0.2, face="determined")
    a.b("bobo", "nod", face="happy", say="Good.")
    a.b("bobo", "walk", to={"x": 2000}, face="determined")
    a.b("bobo", "nod", face="happy", say="Good.")
    a.b("bobo", "face", target="bn_mooka", delay=0.2, face="surprised")
    a.b("bobo", "talk", say="Mooka! Line-up!", bubble="shout", face="angry")
    a.b("bn_mooka", "walk", to={"x": 2150}, face="happy")
    a.b("bn_mooka", "talk", say="Ooh! Okey-dokey!", face="laugh", view="front")
    a.b("bobo", "walk", to={"x": 1500}, face="smug")
    a.b("bn_mooka", "look_around", delay=0.3, face="neutral")
    a.b("bn_mooka", "gasp", delay=0.2, face="surprised")
    a.b("bn_mooka", "sneeze", delay=0.1, face="surprised")
    a.w("world", "sfx", delay=0.7, params={"name": "slide_whistle", "volume": 0.8})
    b = Scene("scatter", "meadow", place(("bobo", 1500), ("bn_mooka", 2300)),
              extras=[{"count": 24, "behavior": "scatter_giggle", "leader": "bobo", "crowd": C, "from": 700, "to": 2700, "at": 0.4, "layer": "back"}],
              transitionIn={"type": "cut"})
    b.b("world", "sfx", at=0.4, params={"name": "giggle_crowd", "volume": 0.9})
    b.b("bobo", "hold_head", at=0.6, face="surprised", say="Baaaana?!", bubble="shout")
    b.b("bobo", "facepalm", delay=0.3, face="tired")
    b.b("bn_mooka", "laugh", delay=0.2, face="laugh", say="Hee-hee!")
    b.b("bobo", "sigh", delay=0.2, face="tired", view="front")
    b.b("world", "fade", delay=0.6, params={"to": "black", "dur": 0.8})
    return script(0, "cold open", [a.done(), b.done()], [MEADOW])


# ---- Part 1: The Basket ------------------------------------------------------------------------------------------
def basket():
    s1 = Scene("plan", "meadow", place(("bobo", 1500), ("tutu", 900), ("zizi", 2200), ("bn_mooka", 2500)),
               transitionIn={"type": "card", "kind": "title", "title": "Baaaana", "subtitle": "Picnic Day", "dur": 2.5},
               extras=[{"count": 10, "behavior": "idle_chat", "crowd": C, "from": 400, "to": 3200, "layer": "back"}])
    s1.b("bobo", "talk", at=0.6, say="Pa-pa-poo!", bubble="shout", view="front", face="happy")
    s1.b("bobo", "point", delay=0.3, say="Picnic!", face="love")
    s1.b("tutu", "walk", to={"x": 1250}, face="happy")
    s1.w("zizi", "walk", to={"x": 1800}, face="happy")
    s1.w("bn_mooka", "walk", to={"x": 2000}, face="happy")
    s1.say([["tutu", "Yum-yum-baaa!", "love"], ["zizi", "Ta-daaa!", "happy"], ["bn_mooka", "Ooh! Picnic!", "surprised"]])
    s1.b("bobo", "talk", delay=0.2, say="Uno, dos, tres...", face="determined")
    s1.b("tutu", "jump_joy", delay=0.2, face="laugh", view="front")
    s1.w("zizi", "jump_joy", delay=0.2, face="laugh", view="front")
    s1.w("bn_mooka", "jump_joy", delay=0.4, face="laugh", view="front")
    s1.b("bobo", "nod", delay=0.3, face="smug")
    s1.b("bobo", "talk", delay=0.2, say="Okey-dokey! Basket!", bubble="shout", face="determined")
    s1.b("world", "spawn_object", delay=0.2, params={"kind": "basket", "x": 1530})
    s1.b("bobo", "pick_prop", delay=0.4, face="happy")
    s1.b("bobo", "victory", delay=0.2, face="laugh", view="front")
    s1.b("world", "sfx", params={"name": "ooh", "volume": 0.8})
    s1.b("bn_mooka", "clap", delay=0.2, face="happy")
    s1.w("tutu", "clap", face="happy")
    s1.w("zizi", "cheer", face="laugh")

    s2 = Scene("pack", "meadow", place(("bobo", 1500), ("tutu", 1720), ("zizi", 2200), ("bn_mooka", 1200)),
               extras=[{"count": 12, "behavior": "copy_leader", "leader": "bobo", "crowd": C, "from": 500, "to": 3100, "layer": "back"}])
    s2.b("bobo", "talk", at=0.6, say="Sandwich... one!", face="determined")
    s2.b("bobo", "kneel", delay=0.2, face="happy")
    s2.b("tutu", "sneak", to={"x": 1600}, delay=0.1, face="smug")
    s2.b("tutu", "eat", face="love")
    s2.b("bobo", "stand_up", delay=0.1, face="happy")
    s2.b("bobo", "talk", say="Sandwich... two!", face="determined")
    s2.b("tutu", "eat", delay=0.1, face="love")
    s2.b("bobo", "look_around", delay=0.1, face="surprised")
    s2.b("tutu", "wave", delay=0.1, face="happy", say="Baaaana!")
    s2.b("bobo", "talk", delay=0.2, say="Sandwich... three!", face="determined")
    s2.b("tutu", "eat", face="love")
    s2.w("world", "sfx", delay=0.4, params={"name": "squeak", "volume": 0.7})
    s2.b("bobo", "face", target="tutu", delay=0.2, face="angry")
    s2.b("bobo", "point", say="TUTU!", bubble="shout", face="furious")
    s2.w("world", "shot", params={"mode": "close_up", "target": "tutu", "dur": 2.6})
    s2.b("tutu", "cower", delay=0.1, face="scared", say="Uh-oh...")
    s2.b("tutu", "cry", delay=0.1, face="cry")
    s2.b("bobo", "sigh", delay=0.2, face="tired")
    s2.b("bobo", "pat_head", partner="tutu", face="happy", say="Aww.")
    s2.b("tutu", "laugh", delay=0.2, face="laugh", say="Hee-hee!")
    s2.w("bobo", "laugh", delay=0.3, face="laugh")
    s2.b("bn_mooka", "look_around", delay=0.2, face="surprised", view="front")
    s2.b("bn_mooka", "talk", say="Ooh?", face="surprised", view="front")

    s3 = Scene("gadget", "meadow", place(("bobo", 1300), ("tutu", 1550), ("zizi", 2300), ("bn_mooka", 1050)),
               extras=[{"count": 8, "behavior": "cheer", "crowd": C, "from": 500, "to": 3100, "layer": "back"}])
    s3.b("zizi", "walk", at=0.5, to={"x": 1850}, face="smug")
    s3.b("zizi", "talk", say="Zizi-zi! Ta-daaa!", bubble="shout", face="laugh", view="front")
    s3.b("zizi", "charge_up", delay=0.2, face="determined")
    s3.w("world", "sfx", delay=0.4, params={"name": "sprout_spring", "volume": 0.8})
    s3.b("bobo", "shake_head", delay=0.1, face="scared", say="No-no-no!")
    s3.b("zizi", "point", target="bobo", face="smug")
    s3.b("world", "flash", params={"color": "#ffffff", "dur": 0.2})
    s3.w("world", "remove_object", object=None, params={}) if False else None
    s3.w("world", "sfx", params={"name": "pop", "volume": 0.9})
    s3.b("bobo", "drop_prop", delay=0.1, face="surprised")
    s3.b("bobo", "gasp", face="surprised", say="Baaaana?!", bubble="shout")
    s3.b("tutu", "gasp", delay=0.1, face="surprised")
    s3.w("bn_mooka", "gasp", delay=0.2, face="surprised")
    s3.b("zizi", "shrug", delay=0.2, face="smug", say="Oopsie!")
    s3.w("world", "sfx", delay=0.3, params={"name": "raspberry", "volume": 0.8})
    s3.b("bobo", "facepalm", delay=0.2, face="tired", view="front")
    s3.w("world", "shot", params={"mode": "close_up", "target": "bobo", "dur": 2.4})
    s3.b("bn_mooka", "laugh", delay=0.2, face="laugh", say="Hee-hee!")
    s3.w("tutu", "laugh", delay=0.3, face="laugh")
    s3.w("zizi", "laugh", delay=0.5, face="laugh")
    s3.b("bobo", "laugh", delay=0.1, face="laugh")

    s4 = Scene("flowers", "meadow", place(("bobo", 1500), ("tutu", 1700), ("zizi", 1900), ("bn_mooka", 600)),
               extras=[{"count": 14, "behavior": "pile_on", "leader": "bn_mooka", "crowd": C, "from": 300, "to": 3300, "at": 26, "layer": "front"}])
    s4.b("world", "spawn_object", at=0.3, params={"kind": "basket", "x": 585})
    s4.b("bn_mooka", "pick_prop", at=0.6, face="happy")
    s4.b("bn_mooka", "walk", to={"x": 1300}, face="happy")
    s4.b("bn_mooka", "talk", say="Mooka! Basket!", face="laugh", view="front")
    s4.say([["bobo", "Ooh! Sandwich?", "surprised"], ["bn_mooka", "Flowers!", "love"]])
    s4.b("world", "sfx", delay=0.2, params={"name": "ding", "volume": 0.8})
    s4.b("bobo", "hold_head", delay=0.2, face="surprised")
    s4.b("tutu", "laugh", face="laugh")
    s4.w("zizi", "laugh", delay=0.2, face="laugh")
    s4.b("bobo", "look_around", delay=0.2, face="tired")
    s4.b("bobo", "laugh", delay=0.1, face="laugh", say="Baaaana!")
    s4.b("bn_mooka", "hug", partner="bobo", face="love")
    s4.b("tutu", "jump_joy", delay=0.2, face="laugh")
    s4.w("zizi", "jump_joy", delay=0.2, face="laugh")
    s4.w("world", "sfx", delay=0.6, params={"name": "giggle_crowd", "volume": 0.9})
    s4.b("bobo", "talk", delay=0.6, say="Okey-dokey... Picnic!", bubble="shout", face="laugh", view="front")
    s4.b("bn_mooka", "wave", delay=0.4, face="laugh", view="front")
    s4.w("world", "shot", params={"mode": "close_up", "target": "bn_mooka", "dur": 2.5})
    s4.b("world", "fade", delay=1.2, params={"to": "black", "dur": 0.8})
    s0 = Scene("list", "meadow", place(("bobo", 1500), ("tutu", 1250), ("zizi", 1800), ("bn_mooka", 2000)),
               extras=[{"count": 14, "behavior": "copy_leader", "leader": "bobo", "crowd": C, "from": 400, "to": 3200, "layer": "back"}])
    s0.b("bobo", "talk", at=0.6, say="List! Uno...", face="determined", view="front")
    for item, who, react, face in [("Cake!", "tutu", "jump_joy", "love"), ("Ball!", "zizi", "flex", "laugh"), ("Blanket!", "bn_mooka", "sleep", "asleep")]:
        s0.b("bobo", "point", delay=0.2, say=item, face="happy")
        s0.b(who, react, delay=0.1, face=face, **({"say": "Yum-yum-baaa!"} if who == "tutu" else {"say": "Zizi-zi!"} if who == "zizi" else {}))
    s0.w("world", "sfx", delay=1.0, params={"name": "squeak", "volume": 0.6})
    s0.b("bobo", "face", target="bn_mooka", delay=0.3, face="surprised")
    s0.b("bobo", "talk", say="Mooka... no sleep!", bubble="shout", face="angry")
    s0.b("bn_mooka", "stand_up", delay=0.2, face="tired")
    s0.b("bn_mooka", "stretch", face="tired")
    s0.b("bn_mooka", "talk", say="Ooh... picnic?", face="happy", view="front")
    s0.b("bobo", "nod", delay=0.2, face="happy", say="Picnic!")
    s0.b("tutu", "dance_a", delay=0.2, face="laugh")
    s0.w("zizi", "dance_b", delay=0.2, face="laugh")
    s0.w("bn_mooka", "dance_a", delay=0.4, face="laugh")
    s3b = Scene("gadget2", "meadow", place(("bobo", 1300), ("tutu", 1550), ("zizi", 1850), ("bn_mooka", 1050)),
                extras=[{"count": 10, "behavior": "scatter_giggle", "leader": "zizi", "crowd": C, "from": 400, "to": 3200, "at": 9, "layer": "back"}])
    s3b.b("zizi", "talk", at=0.6, say="Again! Ta-daaa!", bubble="shout", face="smug", view="front")
    s3b.b("bobo", "shake_head", delay=0.1, face="scared")
    s3b.b("zizi", "charge_up", face="determined")
    s3b.w("world", "sfx", delay=0.4, params={"name": "sprout_spring", "volume": 0.8})
    s3b.b("world", "flash", params={"color": "#ffffff", "dur": 0.2})
    for k, x in enumerate([900, 1700, 2200, 2600]):
        s3b.w("world", "spawn_object", delay=0.1 * k, params={"kind": "basket", "x": x})
    s3b.w("world", "sfx", params={"name": "pop", "volume": 0.9})
    s3b.b("bobo", "gasp", delay=0.3, face="surprised", say="Baskets!", bubble="shout")
    s3b.b("tutu", "jump_joy", delay=0.1, face="love", say="Yum-yum-baaa!")
    s3b.b("zizi", "victory", delay=0.1, face="laugh", say="Ta-daaa!", view="front")
    s3b.b("bn_mooka", "clap", delay=0.2, face="laugh")
    s3b.b("bobo", "hold_head", delay=0.2, face="dizzy")
    s3b.b("world", "sfx", params={"name": "raspberry", "volume": 0.8})
    s3c = Scene("bubbles", "meadow", place(("zizi", 1400), ("bn_mooka", 1600), ("tutu", 1800), ("bobo", 2100)),
                extras=[{"count": 10, "behavior": "cheer", "crowd": C, "from": 400, "to": 3200, "layer": "back"}])
    s3c.b("bobo", "talk", at=0.5, say="Waiting... waiting...", face="tired", view="front")
    s3c.m("activity", {"name": "bubble_party", "with": ["zizi", "bn_mooka", "tutu"], "dur": 16}, delay=0.2)
    s3c.w("bobo", "sigh", delay=2)
    s3c.b("bobo", "laugh", delay=0.2, face="laugh", say="Hee-hee!")
    s6 = Scene("lunch", "meadow", place(("tutu", 2100), ("bn_mooka", 2450), ("bobo", 1700), ("zizi", 1500)))
    s6.b("tutu", "talk", at=0.5, say="Taste test! Yum!", face="love", view="front")
    s6.m("activity", {"name": "eat_together", "with": ["tutu", "bn_mooka"], "object": "bench", "dur": 10}, delay=0.2)
    s6.w("bobo", "talk", delay=2, say="No-no! Picnic food!", face="angry")
    s6.w("bobo", "facepalm", delay=5)
    s6.b("zizi", "laugh", delay=0.2, face="laugh", say="Hee-hee!")
    s6.b("bobo", "sigh", delay=0.2, face="tired", view="front")
    s7 = Scene("gadget3", "meadow", place(("bobo", 1300), ("tutu", 1550), ("zizi", 1850), ("bn_mooka", 1050)),
               extras=[{"count": 12, "behavior": "cheer", "crowd": C, "from": 400, "to": 3200, "layer": "back"}])
    s7.b("zizi", "talk", at=0.6, say="Last one! Ta-daaa!", bubble="shout", face="smug", view="front")
    s7.b("bobo", "cower", delay=0.1, face="scared", say="Uh-oh...")
    s7.b("zizi", "charge_up", face="determined")
    s7.b("world", "flash", params={"color": "#ffffff", "dur": 0.2})
    for k, x in enumerate([1100, 1450, 1800, 2150, 2500]):
        s7.w("world", "spawn_object", delay=0.12 * k, params={"kind": "balloon", "x": x})
    s7.w("world", "sfx", params={"name": "ooh", "volume": 0.8})
    s7.b("tutu", "look_around", delay=0.4, face="surprised", view="front")
    s7.b("bn_mooka", "jump_joy", delay=0.2, face="laugh", say="Ooh! Balloons!")
    s7.b("zizi", "bow", delay=0.2, face="smug")
    s7.b("bobo", "clap", delay=0.2, face="laugh", say="Baaaana!")
    s7.b("world", "sfx", params={"name": "giggle_crowd", "volume": 0.8})
    s8 = Scene("rain", "meadow", place(("bobo", 1300), ("tutu", 1500), ("zizi", 1700), ("bn_mooka", 1900)),
               extras=[{"count": 12, "behavior": "flee", "crowd": C, "from": 400, "to": 3200, "layer": "back"}])
    s8.b("world", "set_weather", at=0.5, params={"weather": "rain", "dur": 1.5})
    s8.b("bobo", "look_around", at=1.0, face="surprised", view="front", say="Uh-oh...")
    s8.b("tutu", "cower", delay=0.1, face="scared", say="Rain!")
    s8.b("world", "sfx", params={"name": "slide_whistle", "volume": 0.7})
    s8.b("bobo", "run", to={"x": 760}, face="scared")
    s8.w("tutu", "run", to={"x": 640}, delay=0.2, face="scared")
    s8.w("zizi", "run", to={"x": 840}, delay=0.3, face="scared")
    s8.b("bn_mooka", "dance_a", face="laugh", say="Bana-na-na!")
    s8.b("bn_mooka", "dance_b", face="laugh")
    s8.b("bobo", "facepalm", face="tired")
    s8.b("world", "set_weather", delay=0.3, params={"weather": "clear", "dur": 1.5})
    s8.b("bn_mooka", "point", delay=0.6, face="love", say="Ooh! Rainbow!", view="front")
    s8.w("world", "sfx", params={"name": "ooh", "volume": 0.8})
    s8.b("bobo", "laugh", delay=0.3, face="laugh")
    s8.w("tutu", "laugh", delay=0.3, face="laugh")
    s8.w("zizi", "laugh", delay=0.5, face="laugh")
    s9 = Scene("practice", "meadow", place(("tutu", 1300), ("zizi", 1450), ("bobo", 1600), ("bn_mooka", 1750)),
               extras=[{"count": 12, "behavior": "sync_dance", "crowd": C, "from": 400, "to": 3200, "at": 1, "layer": "back"}])
    s9.b("bobo", "talk", at=0.5, say="Picnic music! Uno, dos, tres!", bubble="shout", face="laugh", view="front")
    s9.m("activity", {"name": "band_play", "with": ["tutu", "zizi", "bobo", "bn_mooka"], "reps": 4}, delay=0.2)
    s9.b("world", "sfx", params={"name": "giggle_crowd", "volume": 0.8})
    s5 = Scene("goodbye", "meadow", place(("bobo", 1400), ("bn_mooka", 1550), ("tutu", 1700), ("zizi", 1850)),
               extras=[{"count": 24, "behavior": "wave", "crowd": C, "from": 300, "to": 3300, "at": 2, "layer": "back"}])
    s5.b("bobo", "talk", at=0.6, say="Bye-bye! Baaaana!", bubble="shout", face="laugh", view="front")
    s5.b("bn_mooka", "wave", delay=0.2, face="laugh", view="front", say="Bye-bye!")
    s5.w("tutu", "wave", delay=0.2, face="laugh", view="front")
    s5.w("zizi", "wave", delay=0.4, face="laugh", view="front")
    s5.w("world", "sfx", delay=0.6, params={"name": "giggle_crowd", "volume": 0.8})
    s5.m("exit", {"who": "bobo", "side": "right", "mode": "walk"}, delay=0.4)
    s5.m("exit", {"who": "bn_mooka", "side": "right", "mode": "walk"}, delay=0.0, at={"with": s5.last, "delay": 0.3})
    s5.m("exit", {"who": "tutu", "side": "right", "mode": "walk"}, at={"with": s5.last, "delay": 0.3})
    s5.m("exit", {"who": "zizi", "side": "right", "mode": "run"}, at={"with": s5.last, "delay": 0.3})
    s5.b("world", "fade", delay=0.3, params={"to": "black", "dur": 0.8})
    return script(1, "the basket", [x.done() for x in [s1, s0, s2, s6, s3, s3b, s7, s8, s3c, s9, s4, s5]], [MEADOW])


# ---- Part 2: The Road --------------------------------------------------------------------------------------------
def road():
    def walk_scene(sid, travel, view, dur, extras=None, title=None, lines=(), lens0=0):
        """Everyone walks in place (pace walk 2.0: a walk cycle lasts 0.5 s) while the lens travels; each lead's walk is
        cut into 4-second steps so their lines ride on the steps instead of waiting for the walk to end."""
        s = Scene(sid, "road", [{"id": w, "x": x, "z": 250, "view": view} for w, x in zip(LEADS, [1500, 1620, 1760, 1890])],
                  depth={"far": -16000, "horizon": 200}, road={}, roadside={"objects": ["tree_big", "mushroom_hut", "bush", "tree_big", "lamppost", "bush"], "every": 700},
                  lens={"push": 1.6, **({"travel": lens0} if lens0 else {})}, **({"extras": extras} if extras else {}),
                  **({"transitionIn": {"type": "card", "kind": "chapter", "title": title, "dur": 1.6}} if title else {}))
        s.b("world", "set_camera", at=0.3, params={"travel": travel, "dur": min(dur, 30), "ease": "linear"})
        said = {}
        for k, (who, line, face) in enumerate(lines):
            said[(who, k)] = (line, face)
        steps = int(dur // 3.5)
        for w in LEADS:
            prev = None
            for k in range(steps):
                line = next(((l, f) for (who, kk), (l, f) in said.items() if who == w and kk == k), None)
                bid = s._id()
                beat = {"id": bid, "at": {"after": prev} if prev else 0.3, "who": w, "do": "walk", "params": {"stride": 0, "cycles": 7}, "view": view, "face": line[1] if line else "happy"}
                if line:
                    beat["say"] = line[0]
                s.s["beats"].append(beat)
                prev = bid
            s.last = prev
        return s

    def stop_scene(sid, travel, beats_fn, extras=None, view="front"):
        s = Scene(sid, "road", [{"id": w, "x": x, "z": 250, "view": view} for w, x in zip(LEADS, [1500, 1620, 1760, 1890])],
                  depth={"far": -16000, "horizon": 200}, road={}, roadside={"objects": ["tree_big", "mushroom_hut", "bush", "lamppost"], "every": 700},
                  lens={"push": 1.6, "travel": travel}, **({"extras": extras} if extras else {}))
        beats_fn(s)
        return s

    a = walk_scene("set_off", 9000, "front", 32, title="The Road",
                   lines=[("bobo", "Uno, dos, tres... GO!", "determined"), ("tutu", "Yum-yum-baaa!", "love"), ("zizi", "Zizi-zi!", "laugh"),
                          ("bn_mooka", "Ooh! Trees!", "surprised"), ("bobo", "Left, right, left!", "determined"), ("tutu", "Basket! Yum!", "love"),
                          ("zizi", "Pa-pa-poo!", "laugh"), ("bn_mooka", "Hee-hee!", "laugh")])

    def sign(s):
        s.b("bobo", "look_around", at=0.5, face="surprised", view="front")
        s.b("bobo", "point", say="Hill... that way!", face="determined")
        s.b("zizi", "point", delay=0.1, say="No! That way!", face="smug")
        s.b("tutu", "point", delay=0.1, say="Cake way!", face="love")
        s.b("bn_mooka", "point", delay=0.1, say="Ooh! Butterfly way!", face="laugh")
        s.w("world", "sfx", delay=0.5, params={"name": "squeak", "volume": 0.7})
        s.b("bobo", "hold_head", delay=0.2, face="dizzy")
        s.b("bobo", "talk", say="Baaaana... straight!", bubble="shout", face="determined", view="front")
        s.b("tutu", "nod", delay=0.1, face="happy")
        s.w("zizi", "nod", delay=0.2, face="happy")
        s.w("bn_mooka", "nod", delay=0.3, face="happy")
    b = stop_scene("which_way", 9000, sign)

    c = walk_scene("conga", 19000, "front", 32, lens0=9000, extras=[{"count": 12, "behavior": "conga", "leader": "bn_mooka", "crowd": C, "from": 300, "to": 1400}],
                   lines=[("bn_mooka", "Bana-na-na!", "laugh"), ("bobo", "Baaaana?", "surprised"), ("tutu", "Conga!", "laugh"), ("zizi", "Pa-pa-poo!", "laugh"),
                          ("bn_mooka", "Bana-na-na!", "laugh"), ("bobo", "Hee-hee!", "laugh"), ("tutu", "Yum-yum-baaa!", "love"), ("zizi", "Bee-doo!", "laugh")])

    def forgot(s):
        s.b("bobo", "look_around", at=0.6, face="surprised", view="front")
        s.b("bobo", "talk", say="Basket...?", face="scared", view="front")
        s.w("world", "shot", params={"mode": "close_up", "target": "bobo", "dur": 2.5})
        s.b("tutu", "look_around", delay=0.2, face="surprised")
        s.w("zizi", "look_around", delay=0.3, face="surprised")
        s.b("bn_mooka", "shrug", delay=0.2, face="happy", say="Ooh?")
        s.b("tutu", "shrug", delay=0.1, face="sad", say="No basket...")
        s.b("bobo", "hold_head", delay=0.2, face="cry", say="BAAAANA!", bubble="shout")
        s.b("world", "sfx", params={"name": "slide_whistle", "volume": 0.8})
        s.b("zizi", "laugh", delay=0.2, face="laugh")
        s.b("bobo", "point", delay=0.2, face="determined", say="Back! Back!", bubble="shout")
    d = stop_scene("forgot", 19000, forgot)

    def bus(s):
        s.b("world", "spawn_object", at=0.3, params={"kind": "bus", "id": "bus", "x": 400})
        s.b("world", "set_object", object="bus", delay=0.6, params={"exit": "right"})
        s.w("world", "sfx", params={"name": "car_pass", "volume": 0.8})
        s.b("bobo", "wave", delay=0.6, face="laugh", say="Bus! Stop!", bubble="shout", view="front")
        s.w("zizi", "jump", delay=0.4, face="laugh")
        s.b("tutu", "wave", delay=0.3, face="surprised", say="Baaaana!")
        s.b("bobo", "shrug", delay=1.2, face="tired")
        s.b("bn_mooka", "laugh", delay=0.2, face="laugh", say="Hee-hee! Walk!")
        s.b("bobo", "laugh", delay=0.2, face="laugh")
    d2 = stop_scene("bus", 3000, bus)
    e = walk_scene("back", 3000, "back", 28, lens0=19000,
                   lines=[("bobo", "Hurry! Hurry!", "scared"), ("zizi", "Bee-doo bee-doo!", "laugh"), ("tutu", "Puff... puff...", "tired"), ("bn_mooka", "Wheee!", "laugh"), ("bobo", "Faster!", "scared")])

    def found(s):
        s.b("world", "spawn_object", at=0.3, params={"kind": "basket", "x": 1700})
        s.b("tutu", "pick_prop", at=0.8, face="love")
        s.b("tutu", "victory", face="laugh", say="Yum-yum!", view="front")
        s.b("bobo", "sigh", delay=0.2, face="tired")
        s.b("bobo", "laugh", delay=0.2, face="laugh")
        s.b("zizi", "jump_joy", delay=0.1, face="laugh")
        s.w("bn_mooka", "jump_joy", delay=0.2, face="laugh")
    f = stop_scene("found", 3000, found)
    def puddle(s):
        s.b("zizi", "run", at=0.5, to={"x": 1990}, face="laugh")
        s.b("zizi", "stagger", face="surprised")
        s.w("world", "sfx", params={"name": "splash", "volume": 0.8})
        s.b("zizi", "knockdown", face="dizzy", say="Oopsie!")
        s.b("world", "sfx", params={"name": "boing", "volume": 0.7})
        s.b("tutu", "laugh", delay=0.2, face="laugh")
        s.w("bn_mooka", "laugh", delay=0.3, face="laugh")
        s.b("bobo", "talk", delay=0.2, say="Careful! Baaaana!", face="scared")
        s.b("zizi", "get_up", delay=0.2, face="happy")
        s.b("zizi", "shrug", face="laugh", say="Pthbbbt!")
        s.w("world", "sfx", params={"name": "raspberry", "volume": 0.8})
    p1 = stop_scene("puddle", 9000, puddle)

    def nap(s):
        s.b("tutu", "sit", at=0.5, face="tired", say="Puff... puff...")
        s.w("bn_mooka", "lie_down", delay=0.3, face="tired")
        s.b("bn_mooka", "sleep", face="asleep")
        s.b("bobo", "talk", delay=0.2, say="Mooka! Up!", face="angry")
        s.b("zizi", "tiptoe", to={"x": 1700}, face="smug")
        s.b("zizi", "talk", say="Bee-doo bee-doo!", bubble="shout", face="laugh")
        s.w("world", "sfx", params={"name": "slide_whistle", "volume": 0.8})
        s.b("bn_mooka", "get_up", face="surprised")
        s.b("bn_mooka", "jump", face="surprised", say="Ooh!")
        s.b("tutu", "stand_up", delay=0.2, face="happy")
        s.b("bobo", "laugh", delay=0.1, face="laugh")
    p2 = stop_scene("nap", 19000, nap)

    def friends(s):
        s.b("bobo", "look_around", at=0.5, face="surprised", view="front")
        s.b("bobo", "wave", face="laugh", say="Namaste!", view="front")
        s.b("world", "sfx", params={"name": "giggle_crowd", "volume": 0.8})
        s.b("tutu", "wave", delay=0.2, face="laugh", say="Hola!")
        s.w("zizi", "wave", delay=0.3, face="laugh", say="Bonjour!")
        s.w("bn_mooka", "wave", delay=0.6, face="laugh", say="Baaaana!")
        s.b("bobo", "bow", delay=0.3, face="happy")
        s.b("bobo", "talk", delay=0.2, say="Picnic! Come!", face="laugh", view="front")
        s.b("world", "sfx", params={"name": "ooh", "volume": 0.7})
    p3 = stop_scene("friends", 19000, friends, extras=[{"count": 20, "behavior": "wave", "crowd": C, "from": 300, "to": 3300, "at": 1.5, "layer": "back"}])
    g = walk_scene("away", 20000, "back", 32, lens0=3000,
                   lines=[("bobo", "Picnic! Baaaana!", "laugh"), ("tutu", "Yum-yum-baaa!", "love"), ("zizi", "Pa-pa-poo!", "laugh"),
                          ("bn_mooka", "Bana-na-na!", "laugh"), ("bobo", "Uno, dos, tres!", "happy"), ("tutu", "Hill!", "happy"),
                          ("zizi", "Hill! Hill!", "laugh"), ("bn_mooka", "Ooh!", "surprised")])
    g.b("world", "fade", delay=0.2, params={"to": "black", "dur": 1})
    return script(2, "the road", [x.done() for x in [a, b, p1, c, p3, p2, d, e, f, d2, g]], [ROAD])


# ---- Interlude ---------------------------------------------------------------------------------------------------
def interlude():
    a = Scene("wave", "meadow", place(("bobo", 1500)), extras=[{"count": 30, "behavior": "wave", "crowd": C, "from": 300, "to": 3300, "at": 1}],
              transitionIn={"type": "fade", "dur": 0.6})
    a.b("bobo", "talk", at=0.5, say="Baaaana... WAVE!", bubble="shout", face="laugh", view="front")
    a.b("world", "sfx", params={"name": "giggle_crowd", "volume": 0.8})
    a.b("bobo", "cheer", delay=0.3, face="laugh", view="front", params={"cycles": 6})
    a.b("world", "sfx", delay=0.3, params={"name": "ooh", "volume": 0.8})
    a.b("bobo", "jump_joy", delay=0.2, face="laugh")
    a.b("bobo", "dance_a", delay=0.3, face="laugh")
    a.b("bobo", "bow", delay=0.2, face="happy", view="front")
    a.b("world", "fade", delay=3, params={"to": "black", "dur": 0.8})
    return script(3, "interlude", [a.done()], [MEADOW])


# ---- Part 3: The Blanket -----------------------------------------------------------------------------------------
def blanket():
    s1 = Scene("spread", "hill", place(("bobo", 1150), ("tutu", 1350), ("zizi", 1700), ("bn_mooka", 1900)),
               transitionIn={"type": "card", "kind": "chapter", "title": "The Blanket", "dur": 1.6},
               extras=[{"count": 10, "behavior": "idle_chat", "crowd": C, "from": 300, "to": 3300, "layer": "back"}])
    s1.b("bobo", "talk", at=0.6, say="Picnic! Baaaana!", bubble="shout", face="laugh", view="front")
    s1.m("activity", {"name": "picnic", "with": ["tutu", "bn_mooka", "zizi"], "dur": 20}, delay=0.3)
    s1.w("bobo", "sit", delay=1.0)
    s1.w("world", "sfx", delay=6, params={"name": "giggle", "volume": 0.8})
    s1.b("bobo", "stand_up", delay=0.2)
    s1.b("world", "sfx", params={"name": "squeak", "volume": 0.6})
    s1.b("bobo", "look_around", delay=0.3, face="surprised", say="Bzzz?")
    s2 = Scene("bee", "hill", place(("bobo", 1150), ("tutu", 1350), ("zizi", 1700), ("bn_mooka", 1900)),
               extras=[{"count": 14, "behavior": "scatter_giggle", "leader": "zizi", "crowd": C, "from": 300, "to": 3300, "at": 5, "layer": "back"}])
    s2.b("zizi", "point", at=0.6, face="scared", say="Bzzz!", bubble="shout")
    s2.b("tutu", "cower", delay=0.1, face="scared")
    s2.w("bn_mooka", "look_around", face="surprised")
    s2.b("bobo", "talk", delay=0.2, say="Calm... calm...", face="determined", view="front")
    s2.b("world", "sfx", delay=0.4, params={"name": "slide_whistle", "volume": 0.8})
    s2.b("bobo", "run", to={"x": 400}, face="scared")
    s2.w("tutu", "run", to={"x": 3100}, face="scared")
    s2.w("zizi", "run", to={"x": 2800}, face="scared", delay=0.2)
    s2.b("bn_mooka", "wave", delay=0.3, face="happy", say="Bzzz! Hello!", view="front")
    s2.w("world", "shot", params={"mode": "close_up", "target": "bn_mooka", "dur": 2.6})
    s2.b("bn_mooka", "laugh", delay=0.2, face="laugh")
    s2.b("world", "sfx", params={"name": "giggle_crowd", "volume": 0.9})
    s3 = Scene("photo", "hill", place(("bobo", 1150), ("tutu", 1350), ("zizi", 1700), ("bn_mooka", 1900)),
               extras=[{"count": 12, "behavior": "copy_leader", "leader": "tutu", "crowd": C, "from": 400, "to": 3200, "layer": "back"}])
    s3.b("zizi", "talk", at=0.6, say="Photo! Ta-daaa!", bubble="shout", face="laugh", view="front")
    s3.m("activity", {"name": "group_photo", "with": ["zizi", "tutu", "bobo", "bn_mooka"], "reps": 3}, delay=0.2)
    s3.b("bn_mooka", "sleep", delay=0.2, face="asleep")
    s3.w("world", "sfx", delay=0.5, params={"name": "ding", "volume": 0.7})
    s3.b("bobo", "facepalm", delay=0.2, face="tired", say="Mooka...", view="front")
    s3.b("tutu", "laugh", delay=0.2, face="laugh")
    s3.w("zizi", "laugh", delay=0.3, face="laugh")
    s4 = Scene("cake", "hill", place(("bobo", 1150), ("tutu", 1350), ("zizi", 1700), ("bn_mooka", 1900)))
    s4.b("tutu", "walk", at=0.6, to={"x": 1450}, face="love")
    s4.b("tutu", "talk", say="Cake... Yum-yum-baaa!", face="love", view="front")
    s4.b("bobo", "talk", delay=0.2, say="No-no! Later!", face="determined")
    s4.b("tutu", "cry", delay=0.1, face="cry")
    s4.b("bn_mooka", "walk", to={"x": 1580}, delay=0.1, face="love")
    s4.b("bn_mooka", "pat_head", partner="tutu", delay=0.1, face="love", say="Aww.")
    s4.b("bobo", "sigh", delay=0.2, face="tired")
    s4.b("bobo", "nod", delay=0.1, face="happy", say="Okey-dokey. Cake!")
    s4.m("activity", {"name": "picnic", "with": ["tutu", "bn_mooka", "zizi", "bobo"], "dur": 14}, delay=0.2)
    s4.b("world", "fade", delay=0.6, params={"to": "black", "dur": 0.8})
    s5 = Scene("pillows", "hill", place(("tutu", 1300), ("zizi", 1500), ("bobo", 1800), ("bn_mooka", 2000)),
               extras=[{"count": 12, "behavior": "cheer", "crowd": C, "from": 400, "to": 3200, "layer": "back"}])
    s5.b("world", "spawn_object", at=0.3, params={"kind": "pillow", "x": 1320})
    s5.w("world", "spawn_object", params={"kind": "pillow", "x": 1480})
    s5.b("tutu", "pick_prop", at=0.8, face="smug")
    s5.w("zizi", "pick_prop", face="smug")
    s5.b("tutu", "talk", say="Pillow fight!", bubble="shout", face="laugh", view="front")
    s5.m("activity", {"name": "pillow_fight", "with": ["tutu", "zizi"], "dur": 14}, delay=0.2)
    s5.w("bobo", "talk", delay=2, say="No-no! Picnic!", face="scared")
    s5.b("bobo", "hold_head", delay=0.2, face="dizzy")
    s5.b("bn_mooka", "laugh", delay=0.2, face="laugh", say="Hee-hee!")
    s6 = Scene("race", "hill", place(("bobo", 600), ("bn_mooka", 700), ("tutu", 800), ("zizi", 900)),
               extras=[{"count": 14, "behavior": "cheer", "crowd": C, "from": 300, "to": 3300, "layer": "back"}])
    s6.b("bobo", "talk", at=0.6, say="Race! Uno, dos, tres...", bubble="shout", face="determined", view="front")
    s6.m("activity", {"name": "sports_day_race", "with": ["bobo", "bn_mooka", "tutu", "zizi"], "winner": "bn_mooka"}, delay=0.2)
    s6.b("bn_mooka", "talk", delay=0.2, say="Mooka! Ooh!", face="laugh", view="front")
    s6.b("world", "sfx", params={"name": "ooh", "volume": 0.8})
    s6.b("zizi", "shrug", delay=0.2, face="smug", say="Pthbbbt!")
    s7 = Scene("nap", "hill", place(("bobo", 1300), ("bn_mooka", 1500), ("tutu", 1700), ("zizi", 1900)), time="day")
    s7.b("tutu", "lie_down", at=0.5, face="tired")
    s7.w("bn_mooka", "lie_down", delay=0.3, face="tired")
    s7.w("zizi", "sit", delay=0.6, face="tired")
    s7.b("tutu", "sleep", face="asleep")
    s7.w("bn_mooka", "sleep", delay=0.2, face="asleep")
    s7.b("bobo", "talk", delay=0.5, say="Shhh... nap.", bubble="whisper", face="happy", view="front")
    s7.b("bobo", "sit", delay=0.2, face="tired")
    s7.b("world", "sfx", delay=2, params={"name": "giggle", "volume": 0.5})
    s7.b("zizi", "stand_up", delay=0.3, face="smug")
    s7.b("zizi", "tiptoe", to={"x": 1600}, face="smug")
    s7.b("zizi", "talk", say="Bee-doo!", bubble="shout", face="laugh")
    s7.w("world", "sfx", params={"name": "slide_whistle", "volume": 0.8})
    s7.b("tutu", "get_up", delay=0.1, face="surprised")
    s7.w("bn_mooka", "get_up", delay=0.2, face="surprised")
    s7.b("tutu", "laugh", delay=0.2, face="laugh")
    s7.w("bobo", "laugh", delay=0.2, face="laugh")
    s8 = Scene("ball", "hill", place(("zizi", 1100), ("bobo", 1900), ("bn_mooka", 1300), ("tutu", 2300)))
    s8.b("zizi", "talk", at=0.5, say="Ball! Zizi-zi!", face="laugh", view="front")
    s8.m("activity", {"name": "play_catch", "with": ["zizi", "bobo"], "reps": 5}, delay=0.2)
    s8.m("activity", {"name": "kick_ball", "with": ["bn_mooka", "tutu"], "reps": 4}, delay=0.3)
    s8.b("world", "sfx", params={"name": "boing", "volume": 0.7})
    s8.b("tutu", "laugh", delay=0.2, face="laugh")
    s9 = Scene("dance", "hill", place(("bobo", 1350), ("bn_mooka", 1500), ("tutu", 1650), ("zizi", 1800)),
               extras=[{"count": 16, "behavior": "sync_dance", "crowd": C, "from": 300, "to": 3300, "at": 1, "bpm": 140, "layer": "back"}])
    s9.b("tutu", "talk", at=0.5, say="Dance! Yum-yum-baaa!", bubble="shout", face="laugh", view="front")
    s9.m("activity", {"name": "dance_together", "with": ["bobo", "bn_mooka", "tutu", "zizi"], "reps": 6}, delay=0.2)
    s9.b("world", "sfx", params={"name": "giggle_crowd", "volume": 0.8})
    s10 = Scene("kite", "hill", place(("zizi", 1300), ("bn_mooka", 1600), ("tutu", 1800), ("bobo", 2000)))
    s10.b("world", "spawn_object", at=0.3, params={"kind": "kite", "x": 1340})
    s10.b("zizi", "pick_prop", at=0.8, face="laugh")
    s10.b("zizi", "talk", say="Kite! Zizi-zi!", bubble="shout", face="laugh", view="front")
    s10.b("zizi", "run", to={"x": 2600}, face="laugh")
    s10.w("world", "sfx", delay=1, params={"name": "ooh", "volume": 0.7})
    s10.b("bn_mooka", "point", delay=0.2, face="love", say="Ooh!", view="front")
    s10.b("tutu", "clap", delay=0.1, face="happy")
    s10.w("bobo", "clap", delay=0.2, face="happy")
    s10.b("zizi", "run", to={"x": 1500}, delay=0.2, face="laugh")
    s10.b("zizi", "stagger", face="dizzy", say="Oopsie!")
    s10.w("world", "sfx", params={"name": "boing", "volume": 0.7})
    s10.b("bobo", "laugh", delay=0.2, face="laugh")
    return script(4, "the blanket", [x.done() for x in [s1, s2, s5, s8, s3, s10, s6, s7, s9, s4]], [HILL])


# ---- Part 4: The Hill --------------------------------------------------------------------------------------------
def hill():
    s1 = Scene("tower", "hill", place(("bobo", 1500), ("tutu", 1700), ("zizi", 2100), ("bn_mooka", 1300)),
               transitionIn={"type": "card", "kind": "chapter", "title": "The Hill", "dur": 1.6})
    s1.b("zizi", "point", at=0.6, say="View! Zizi-zi!", face="laugh")
    s1.b("zizi", "climb_up", object="tower", face="determined")
    s1.b("zizi", "look_around", face="surprised", view="front")
    s1.b("zizi", "talk", say="Ooooh!", bubble="shout", face="love", view="front")
    s1.w("world", "sfx", params={"name": "ooh", "volume": 0.8})
    s1.b("zizi", "wave", face="laugh", view="front")
    s1.b("bobo", "talk", delay=0.2, say="Careful!", bubble="shout", face="scared")
    s1.b("zizi", "jump_joy", face="laugh")
    s1.b("zizi", "climb_down", object="tower", face="happy")
    s2 = Scene("pyramid", "hill", place(("bobo", 1400), ("bn_mooka", 1550), ("tutu", 1700), ("zizi", 2000)),
               extras=[{"count": 12, "behavior": "cheer", "crowd": C, "from": 400, "to": 3200, "layer": "back"}])
    s2.b("bobo", "talk", at=0.6, say="Baaaana pyramid!", bubble="shout", face="determined", view="front")
    s2.m("activity", {"name": "human_pyramid", "with": ["bobo", "bn_mooka", "tutu"]}, delay=0.3)
    s2.b("world", "sfx", params={"name": "boing", "volume": 0.9})
    s2.b("zizi", "laugh", delay=0.1, face="laugh", say="Hee-hee!")
    s2.b("bobo", "get_up", delay=0.2, face="dizzy")
    s2.b("bobo", "laugh", delay=0.2, face="laugh")
    s3 = Scene("pile", "hill", place(("bobo", 1500), ("bn_mooka", 1650), ("tutu", 1800), ("zizi", 1950)),
               extras=[{"count": 16, "behavior": "pile_on", "leader": "tutu", "crowd": C, "from": 300, "to": 3300, "at": 4, "layer": "front"}])
    s3.b("tutu", "talk", at=0.6, say="Group hug!", bubble="shout", face="love", view="front")
    s3.b("tutu", "hug", partner="bn_mooka", face="love")
    s3.b("world", "sfx", params={"name": "giggle_crowd", "volume": 0.9})
    s3.b("bobo", "laugh", delay=0.4, face="laugh")
    s3.w("zizi", "laugh", delay=0.2, face="laugh")
    s3.b("bobo", "talk", delay=0.3, say="Baaaana!", face="laugh", view="front")
    s3.b("world", "fade", delay=2.0, params={"to": "black", "dur": 0.8})
    s4 = Scene("tug", "hill", place(("bobo", 1300), ("bn_mooka", 1450), ("tutu", 1650), ("zizi", 1800)),
               extras=[{"count": 14, "behavior": "cheer", "crowd": C, "from": 300, "to": 3300, "layer": "back"}])
    s4.b("zizi", "talk", at=0.6, say="Tug! Zizi-zi!", bubble="shout", face="laugh", view="front")
    s4.m("activity", {"name": "tug_of_war", "with": ["bobo", "bn_mooka", "tutu", "zizi"], "dur": 12, "winner": "tutu"}, delay=0.2)
    s4.b("world", "sfx", params={"name": "boing", "volume": 0.8})
    s4.b("tutu", "victory", delay=0.2, face="laugh", say="Yum-yum-baaa!", view="front")
    s4.b("bobo", "get_up", delay=0.2, face="dizzy")
    s5 = Scene("wall", "hill", place(("bobo", 1300), ("bn_mooka", 700), ("tutu", 1550), ("zizi", 1750)))
    s5.b("bn_mooka", "climb_up", at=0.5, object="wall", face="determined")
    s5.b("bn_mooka", "talk", say="Ooh! High!", face="laugh", view="front")
    s5.b("bn_mooka", "lie_down", delay=0.2, face="tired")
    s5.b("bn_mooka", "sleep", face="asleep")
    s5.b("bobo", "talk", delay=0.3, say="Mooka...?", face="surprised")
    s5.b("bobo", "climb_up", object="wall", face="determined")
    s5.b("bobo", "talk", say="Mooka! Up!", bubble="shout", face="angry")
    s5.b("bn_mooka", "get_up", face="surprised")
    s5.b("bn_mooka", "jump_down", face="laugh", say="Wheee!")
    s5.b("bobo", "jump_down", delay=0.3, face="scared", say="Baaaana!")
    s5.b("world", "sfx", params={"name": "boing", "volume": 0.8})
    s5.b("tutu", "laugh", delay=0.2, face="laugh")
    s5.w("zizi", "laugh", delay=0.2, face="laugh")
    s6 = Scene("conga", "hill", place(("bn_mooka", 1500), ("bobo", 1350), ("tutu", 1200), ("zizi", 1050)),
               extras=[{"count": 14, "behavior": "conga", "leader": "bn_mooka", "crowd": C, "from": 300, "to": 1300}])
    s6.b("bn_mooka", "talk", at=0.5, say="Bana-na-na!", face="laugh", view="front")
    s6.b("bn_mooka", "walk", to={"x": 2900}, face="laugh")
    s6.w("bobo", "walk", to={"x": 2750}, delay=0.4, face="laugh")
    s6.w("tutu", "walk", to={"x": 2600}, delay=0.8, face="laugh")
    s6.w("zizi", "walk", to={"x": 2450}, delay=1.2, face="laugh")
    s6.b("bn_mooka", "walk", to={"x": 1200}, delay=0.3, face="laugh")
    s6.w("bobo", "walk", to={"x": 1350}, delay=0.3, face="laugh")
    s6.w("tutu", "walk", to={"x": 1500}, delay=0.6, face="laugh")
    s6.w("zizi", "walk", to={"x": 1650}, delay=0.9, face="laugh")
    s6.b("world", "sfx", delay=0.5, params={"name": "giggle_crowd", "volume": 0.8})
    s7 = Scene("garden", "hill", place(("bobo", 1200), ("zizi", 1400), ("tutu", 1600), ("bn_mooka", 1900)))
    s7.b("bobo", "talk", at=0.5, say="Flowers! Remember picnic day!", face="happy", view="front")
    s7.m("activity", {"name": "garden_planting", "with": ["bobo", "zizi", "tutu"], "dur": 18}, delay=0.2)
    s7.w("bn_mooka", "talk", delay=3, say="Ooh! Flower!", face="love", view="front")
    s7.b("bn_mooka", "hug", partner="tutu", face="love")
    s7.b("bobo", "nod", delay=0.3, face="love", say="Aww.")
    s8 = Scene("hide", "hill", place(("bobo", 1500), ("bn_mooka", 1300), ("tutu", 1700), ("zizi", 1900)))
    s8.b("bobo", "talk", at=0.5, say="Hide! Uno, dos, tres...", face="happy", view="front")
    s8.b("bobo", "hold_head", face="happy")
    s8.w("tutu", "run", to={"x": 900}, delay=0.3, face="laugh")
    s8.w("zizi", "run", to={"x": 2600}, delay=0.3, face="laugh")
    s8.w("bn_mooka", "walk", to={"x": 1450}, delay=0.6, face="happy")
    s8.b("tutu", "hide", delay=0.2, face="smug")
    s8.w("zizi", "peek", delay=0.3, face="smug")
    s8.b("bobo", "look_around", delay=0.4, face="surprised", view="front")
    s8.b("bobo", "talk", say="Where? Where?", face="surprised", view="front")
    s8.b("bn_mooka", "talk", delay=0.2, say="Here! Ooh!", face="laugh", view="front")
    s8.w("world", "shot", params={"mode": "close_up", "target": "bn_mooka", "dur": 2.5})
    s8.b("bobo", "jump", delay=0.1, face="surprised")
    s8.b("bobo", "laugh", delay=0.1, face="laugh")
    s8.w("bn_mooka", "laugh", delay=0.2, face="laugh")
    s9 = Scene("sunset", "hill", place(("bobo", 2150), ("tutu", 2000), ("zizi", 1700), ("bn_mooka", 1500)), time="dusk", light="golden")
    s9.b("bobo", "climb_up", at=0.5, object="tower", face="determined")
    s9.b("tutu", "climb_up", object="tower", face="determined")
    s9.b("bobo", "talk", say="Ooooh... sunset.", face="love", view="front")
    s9.w("world", "sfx", params={"name": "ooh", "volume": 0.7})
    s9.b("tutu", "cry", delay=0.2, face="cry", say="Aww...")
    s9.b("bobo", "pat_head", partner="tutu", face="love")
    s9.b("zizi", "wave", delay=0.3, face="laugh", say="Come down!")
    s9.b("bobo", "climb_down", object="tower", face="happy")
    s9.b("tutu", "climb_down", object="tower", face="happy")
    s10 = Scene("photo_end", "hill", place(("bobo", 1500), ("bn_mooka", 1650), ("tutu", 1800), ("zizi", 2700)), time="dusk", light="golden",
                extras=[{"count": 16, "behavior": "copy_leader", "leader": "bobo", "crowd": C, "from": 400, "to": 2600, "layer": "back"}])
    s10.b("zizi", "talk", at=0.5, say="Photo! Uno, dos, tres!", bubble="shout", face="laugh", view="front")
    s10.b("zizi", "run", to={"x": 1980}, face="laugh")
    s10.b("bobo", "pose_peace", delay=0.2, face="happy", view="front")
    s10.w("bn_mooka", "pose_peace", face="laugh", view="front")
    s10.w("tutu", "flex", face="laugh", view="front")
    s10.w("zizi", "jump_joy", face="laugh", view="front")
    s10.w("world", "flash", delay=0.8, params={"color": "#ffffff", "dur": 0.15})
    s10.w("world", "sfx", delay=0.8, params={"name": "pop", "volume": 0.8})
    s10.b("bn_mooka", "sleep", delay=0.2, face="asleep")
    s10.b("bobo", "facepalm", delay=0.2, face="tired", say="Mooka...", view="front")
    s10.b("tutu", "laugh", delay=0.2, face="laugh")
    s10.w("zizi", "laugh", delay=0.2, face="laugh")
    s11 = Scene("wave", "hill", place(("bobo", 700), ("bn_mooka", 1500), ("tutu", 1650), ("zizi", 1800)),
                extras=[{"count": 24, "behavior": "wave", "crowd": C, "from": 300, "to": 3300, "at": 6, "layer": "back"}])
    s11.b("bobo", "climb_up", at=0.5, object="wall", face="determined")
    s11.b("bobo", "talk", say="Baaaana... WAVE!", bubble="shout", face="laugh", view="front")
    s11.b("bobo", "cheer", face="laugh", view="front", params={"cycles": 6})
    s11.w("world", "sfx", delay=0.5, params={"name": "giggle_crowd", "volume": 0.8})
    s11.w("bn_mooka", "jump_joy", delay=1.0, face="laugh")
    s11.w("tutu", "jump_joy", delay=1.3, face="laugh")
    s11.w("zizi", "jump_joy", delay=1.6, face="laugh")
    s11.b("bobo", "jump_down", delay=0.2, face="laugh", say="Wheee!")
    home = Scene("home", "road", [{"id": w, "x": x, "z": 250, "view": "front"} for w, x in zip(LEADS, [1500, 1620, 1760, 1890])], time="dusk", light="golden",
                 depth={"far": -16000, "horizon": 200}, road={}, roadside={"objects": ["tree_big", "mushroom_hut", "bush", "lamppost"], "every": 700}, lens={"push": 1.6},
                 extras=[{"count": 10, "behavior": "conga", "leader": "tutu", "crowd": C, "from": 300, "to": 1400}])
    home.b("world", "set_camera", at=0.3, params={"travel": 12000, "dur": 30, "ease": "linear"})
    lines = {"bobo": ["Good picnic!", "Baaaana!"], "tutu": ["Yum-yum-baaa!", "Cake... gone."], "zizi": ["Zizi-zi!", "Again tomorrow?"], "bn_mooka": ["Ooh! Stars!", "Mooka... sleepy."]}
    for w in LEADS:
        prev = None
        for k in range(9):
            bid = home._id()
            beat = {"id": bid, "at": {"after": prev} if prev else 0.3, "who": w, "do": "walk", "params": {"stride": 0, "cycles": 7}, "view": "front", "face": "happy"}
            if k in (1 + LEADS.index(w), 5 + LEADS.index(w) % 3):
                beat["say"] = lines[w][0 if k < 5 else 1]
            home.s["beats"].append(beat)
            prev = bid
        home.last = prev
    home.b("world", "fade", delay=0.2, params={"to": "black", "dur": 1})
    return script(5, "the hill", [x.done() for x in [s1, s4, s2, s8, s5, s6, s11, s9, s7, s10, s3, home]], [HILL, ROAD])


# ---- Closing song ------------------------------------------------------------------------------------------------
def song():
    a = Scene("band", "hill", place(("bobo", 1400), ("bn_mooka", 1560), ("tutu", 1720), ("zizi", 1880)), time="dusk", light="golden",
              transitionIn={"type": "card", "kind": "chapter", "title": "Baaaana Song", "dur": 1.6},
              extras=[{"count": 24, "behavior": "sync_dance", "crowd": C, "from": 300, "to": 3300, "at": 1, "bpm": 140, "layer": "back"}],
              music={"mood": "bouncy", "volume": 0.5, "intensity": "high"} if False else {"mood": "bouncy", "volume": 0.5})
    a.m("activity", {"name": "band_play", "with": ["tutu", "zizi", "bobo", "bn_mooka"], "reps": 14}, at=0.5)
    a.m("activity", {"name": "conga_line", "with": ["bobo", "bn_mooka", "tutu", "zizi"], "reps": 8}, delay=0.3)
    a.b("bn_mooka", "talk", delay=0.2, say="Baaaana!", bubble="shout", face="laugh", view="front")
    a.w("world", "shot", params={"mode": "close_up", "target": "bn_mooka", "dur": 2.6})
    a.b("bn_mooka", "wave", face="laugh", view="front")
    a.b("world", "end_card", delay=0.4, params={"text": "Baaaana!"})
    return script(6, "song", [a.done()], [HILL])


os.makedirs(OUT, exist_ok=True)
for i, fn in enumerate([cold_open, basket, road, interlude, blanket, hill, song]):
    d = fn()
    name = ["0_cold_open", "1_basket", "2_road", "3_interlude", "4_blanket", "5_hill", "6_song"][i]
    json.dump(d, open(f"{OUT}/{name}.json", "w"), indent=1)
print("ok")
