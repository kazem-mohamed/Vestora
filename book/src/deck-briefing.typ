#import "/lib/slides.typ": *
#import "/lib/theme.typ": *

#show: deck

// ─────────────────────────────────────────────────────────────────────
// NOT FOR PROJECTION.
//
// This is the team's own preparation. It lived inside the presentation file
// until it was noticed that a slide headed "claims to avoid" was one arrow key
// away from the committee. It is a separate document for that reason alone.
// ─────────────────────────────────────────────────────────────────────

#set page(footer: none)
#v(1fr)
#align(center)[
  #text(font: display-font, size: 34pt, weight: 600, tracking: 0.06em)[TEAM BRIEFING]
  #v(5mm)
  #text(size: 16pt, fill: muted)[Preparation notes — not part of the presentation]
  #v(10mm)
  #block(width: 70%, callout(label: "Do not open this file in the room", accent: bronze)[
    #set text(size: 14pt)
    The presentation is `deck.pdf`. This document exists so that nothing in it
    can be projected by accident.
  ])
]
#v(1fr)
#set page(footer: auto)

#slide(eyebrow-text: "Preparation", title: "Questions to expect")[
  #v(2mm)
  #set text(size: 13.5pt)
  #table(
    columns: (1fr, auto),
    align: (left + top, left + top),
    table.header([Question], [Where the answer lives]),
    ["Does money actually move?"],
      [No — sandbox only, and the app refuses a live key (§11.10).
       The \$9.2M on the revenue page is simulated volume],
    ["Where are your tests?"],
      [85 passing: 57 domain, 28 integration (§15.2)],
    ["So the system is proven correct?"],
      [No. Integration runs in-memory — no query translation proof],
    ["What is a role check versus an ownership check?"],
      [A founder who is also an investor passes every role gate (§10.8)],
    ["What if the webhook fires twice?"],
      [Unique index on the provider event id — the second insert fails (§11.5)],
    ["Can an administrator read a private deal room?"],
      [Read yes, act no — refused at the endpoint on all three term routes],
    ["Why is the listing slower than the target?"],
      [A fixed floor, not a slow plan — remote database round trip (§17.3)],
    ["Why not microservices?"],
      [ADR-06 (§6.2) — a layered monolith, with the cost stated],
    ["What is the hardest thing you solved?"],
      [Ch18 — the status column with three writers, or the audit row copies],
  )
]

#slide(eyebrow-text: "Preparation", title: "Numbers to know, and claims to avoid")[
  #v(2mm)
  #two(
    [
      #callout(label: "Know these cold")[
        #set text(size: 13.5pt)
        - 25 controllers · 169 endpoints
        - 34 entity sets · 30 migrations
        - 58 frontend routes
        - *85 tests* — 57 domain, 28 integration, 29 s
        - `PipelineStages` 100% branch covered
        - Listing p95 = *519 ms* against a 300 ms target
        - Platform: \$9.2M volume · \$460,050 fees · 53 settled · 0 refunds
      ]
    ],
    [
      #callout(label: "Never say these", accent: bronze)[
        #set text(size: 13.5pt)
        - "It is fully tested" — it is not
        - "It is production ready" — no CI, no load test, one instance
        - "It handles real payments" — sandbox only, by design
        - "It is secure" — say what is enforced, and where
        - "It scales" — presence and the queue are process-local
      ]
      #v(4mm)
      #text(size: 13.5pt, fill: muted)[
        Every one of these has an honest version that is *stronger*, because the
        committee can check it. The book states each limit in the chapter that
        would otherwise be expected to hide it.
      ]
    ],
  )
]

#slide(eyebrow-text: "Preparation", title: "If the demo fails")[
  #v(3mm)
  #two(
    [
      #callout(label: "The fallback is already in the deck", accent: gold)[
        #set text(size: 14pt)
        Pages 10 to 13 carry the journey as captures of live rows: discovery,
        the deal room and its health score, the measured timeline, and the
        platform economics. The route sheet names the page to jump to for every
        beat, so the fallback needs no decision in the moment.
      ]
      #v(5mm)
      #set text(size: 14pt)
      Say it plainly and move on. A presenter who narrates a failing demo loses
      more time than one who switches to the slides and keeps talking.
    ],
    [
      #set text(size: 14pt)
      *The setup lives in `deck-demo.pdf`,* not here — four signed-in windows,
      the frontend built for production, and the ten beats in the order they are
      walked. It is the sheet to hold while the demo runs; this one is for the
      questions that come after it.

      #v(4mm)
      *The demo is optional.* The deck stands on its own, and it was built that
      way deliberately. The route is read-only, so nothing on it can be spent by
      rehearsing it.
    ],
  )
]
