#import "/lib/slides.typ": *
#import "/lib/theme.typ": *

#show: deck

// ─────────────────────────────────────────────────────────────────────
// NOT FOR PROJECTION.
//
// The presenter's route through the running system. It is a separate file
// from both the deck and the briefing because it is read at a different
// time: the deck is projected, the briefing is read the night before, and
// this is held while the demo is running.
//
// The route is deliberately READ-ONLY. Every figure it shows was written
// by the journey of 4 September, and nothing on the route writes anything
// new — so it can be rehearsed as many times as anyone wants, it cannot be
// broken by a lapsed session or a mistyped card, and it cannot fail twice
// the same way. The one live write available is marked, and optional.
// ─────────────────────────────────────────────────────────────────────

#set page(footer: none)
#v(1fr)
#align(center)[
  #text(font: display-font, size: 34pt, weight: 600, tracking: 0.06em)[DEMO ROUTE]
  #v(5mm)
  #text(size: 16pt, fill: muted)[The presenter's script — not part of the presentation]
  #v(10mm)
  #block(width: 74%, callout(label: "Ten beats, about six minutes", accent: gold)[
    #set text(size: 14pt)
    Nothing on this route writes to the database. It shows a journey that has
    already happened, which is why it can be rehearsed without limit and cannot
    be spoiled by a lapsed checkout session.
  ])
]
#v(1fr)
#set page(footer: auto)

#slide(eyebrow-text: "Preparation", title: "Starting it")[
  #v(2mm)
  #two(
    [
      #set text(size: 12.5pt)
      *Two terminals, from the repository root. The API first* — the frontend
      calls it on load, and a frontend that starts against a dead API caches the
      failure in the first screen you show.

      #v(2mm)
      #text(size: 11.5pt)[*Terminal 1 — the API*]
      ```
      cd MyAppApi/MyAppApi
      dotnet run --launch-profile http
      ```

      #v(2mm)
      #text(size: 11.5pt)[*Terminal 2 — the frontend, built for production*]
      ```
      cd Frontend/vestora
      npm run build
      npm start
      ```

      #v(2mm)
      The build takes a few minutes and only has to happen once. On the day,
      `npm start` alone is enough — unless the code changed, in which case build
      again or the running copy is the old one.
    ],
    [
      #callout(label: "Why not npm run dev", accent: bronze)[
        #set text(size: 13pt)
        In development Next.js paints its own issue badge over the corner of
        every page. A red counter on a projector reads as a broken application,
        and no amount of explaining takes that back.

        #v(2mm)
        The production build is also the faster one, which matters on a remote
        database.
      ]
      #v(4mm)
      #set text(size: 13pt)
      *Then check both, before anything else:*

      #v(1.5mm)
      #set text(size: 12pt)
      `http://localhost:5078/swagger` \
      `http://localhost:3000/projects`

      #v(2mm)
      #text(fill: muted)[
        Both must answer. If the API is down the second one still renders — with
        an empty list, which is the worst way to find out.
      ]
    ],
  )
]

#slide(eyebrow-text: "Preparation", title: "Four windows, and the last five minutes")[
  #v(2mm)
  #two(
    [
      #set text(size: 12.5pt)
      *Four separate sessions, already signed in, already on their opening URL.*
      Signing in during a demo is dead air, and a mistyped password in front of a
      committee is worse.

      #v(2mm)
      One browser gives two sessions — a normal window and a private one — so
      two browsers give the four. Arrange them in route order and do not close
      the private windows, which forget everything when the last one goes.

      #v(2mm)
      #set text(size: 12pt)
      #text(fill: bronze)[1] Chrome, private — signed out, on `/projects` \
      #text(fill: bronze)[2] Chrome — `book.capture@vestora.local` \
      #text(fill: bronze)[3] Edge — `book.founder@vestora.local` \
      #text(fill: bronze)[4] Edge, InPrivate — `book.admin@vestora.local`

      #v(2mm)
      #text(size: 12pt)[All three accounts share one password:
      `BookCapture!2026`.]
    ],
    [
      #callout(label: "The last five minutes", accent: bronze)[
        #set text(size: 13pt)
        - Every window loaded once, so nothing is cold
        - Browser zoom at 110%, bookmarks bar hidden
        - Screen *mirrored*, not extended
        - `deck.pdf` left on page 9, the divider that announces the demo
      ]
      #v(4mm)
      #set text(size: 13pt, fill: muted)
      The route assumes English and the light theme. It works identically in
      Arabic — the language switch is worth showing if a committee member asks,
      and it is one click in the header.
    ],
  )
]

#slide(eyebrow-text: "The route", title: "Beats 1 to 5 — what was found, and what was agreed")[
  #v(1mm)
  #set text(size: 11.5pt)
  #table(
    columns: (auto, auto, 1fr, auto),
    align: (center + top, left + top, left + top, center + top),
    table.header([\#], [Where], [Do, and say], [Page]),

    [1], [`/projects` \ #text(fill: muted)[signed out]],
    [Apply a sector filter, then change the sort. \
     #text(fill: muted)[_"No account, and thirty-six ventures. They are found on their
     attributes — stage, sector, city, round — not by knowing somebody."_]], [10],

    [2], [click \ *شمس · Shams Solar*],
    [Scroll to where the action would be: it says *Request access*. \
     #text(fill: muted)[_"Reading is open. Acting is not. That is an account boundary, not a
     paywall."_]], [10],

    [3], [investor \ `/invest/portfolio`],
    [#text(fill: muted)[_"The same venture, from the other side. One backer, \$120,000,
     forty-eight per cent of a \$250,000 round."_]], [11],

    [4], [investor \ `/deals/227`],
    [Point at the two badges in the header. \
     #text(fill: muted)[_"*Committed* is where the relationship stands. *Funded* is money that
     settled. They are different columns because they answer different
     questions."_]], [11],

    [5], [same page, \ right column],
    [Read the timeline aloud, bottom to top, then the stage durations. \
     #text(fill: muted)[_"Nobody typed any of this. Each row was written by the action that
     caused it, and the durations are measured, not estimated."_]], [12],
  )
]

#slide(eyebrow-text: "The route", title: "Beats 6 to 10 — what settled, and who can see it")[
  #v(1mm)
  #set text(size: 11.5pt)
  #table(
    columns: (auto, auto, 1fr, auto),
    align: (center + top, left + top, left + top, center + top),
    table.header([\#], [Where], [Do, and say], [Page]),

    [6], [investor \ *View receipt*],
    [#text(fill: muted)[_"`VST-TX-2026-000053`. A reference a person can read out over a
     phone."_]], [--],

    [7], [investor \ `/deals/150`],
    [Type the address in front of them. It refuses. \
     #text(fill: muted)[_"A deal room this investor is not part of. Not a 404 — a refusal. A
     role check would have let them in; an ownership check is what stops
     them."_] #text(fill: bronze)[This is the beat to slow down on.]], [11],

    [8], [founder \ `/dashboard/funding`],
    [#text(fill: muted)[_"\$120,000 arrived. \$114,000 is the founder's. The five per cent
     between them is the platform's, and it was frozen at the moment of
     payment."_]], [13],

    [9], [admin \ `/admin/revenue`],
    [#text(fill: muted)[_"\$460,050 across fifty-three settlements. Not one of those numbers
     is stored. Each is a sum over rows, computed on read."_]], [13],

    [10], [admin \ `/admin/audit`],
    [The top three rows are today's journey. \
     #text(fill: muted)[_"One transaction, three audit rows — the attempt, the settlement, the
     fee and the net. With who did it, and when."_]], [--],
  )
  #v(2mm)
  #text(size: 12pt)[Then return to `deck.pdf`, page 14 — the divider that opens "How it is defended".]
]

#slide(eyebrow-text: "Discipline", title: "What this route does not do")[
  #v(3mm)
  #two(
    [
      #callout(label: "It writes nothing", accent: gold)[
        #set text(size: 13.5pt)
        Every beat is a read. The journey it walks through — request, approval,
        funding request, settlement — was completed on 4 September and is now
        history.

        #v(2mm)
        So the route can be rehearsed all morning without drifting, and a second
        run in front of the committee shows exactly what the first one did.
      ]
      #v(3mm)
      #set text(size: 12.5pt)
      *For a live payment instead,* an approved relationship with no funding
      request yet can be prepared: the founder asks for the money and the
      investor settles it in the room. Stronger, and more fragile — it needs the
      sandbox reachable, a test card typed correctly, and a checkout session
      that lapses after thirty-five minutes.
    ],
    [
      #callout(label: "If a beat fails", accent: bronze)[
        #set text(size: 13.5pt)
        Say so once, move to the deck page in the last column, and keep talking. The
        deck carries the same evidence as captures — it was built that way on
        purpose.

        #v(2mm)
        Do not reload, do not open the console, do not narrate the failure. A
        presenter who debugs in front of a committee loses the room and the
        clock together.
      ]
      #v(4mm)
      #set text(size: 13pt, fill: muted)
      The most likely failure is the slowest page rather than a broken one: the
      database is remote, so a cold listing takes about half a second longer
      than a warm one. Loading every window once before the room removes it.
    ],
  )
]
