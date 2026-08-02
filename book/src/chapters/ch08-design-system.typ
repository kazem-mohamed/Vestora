#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= UI/UX Design System <ch:design>

== Design Principles

A platform asking strangers to exchange money must look like it can be trusted
before anyone reads a word of it. Interface quality here is not decoration; it
is the first evidence a visitor has, and it is doing work that no feature can
do.

Four principles govern every decision in this chapter.

/ Restraint over decoration: Financial interfaces lose credibility through
  excess, not through plainness. The system uses one display face, one accent,
  and a great deal of space.

/ One motif, used sparingly: A single structural idea — the chamfered plate —
  carries the identity. It appears where structure genuinely changes, not on
  every surface. A motif applied everywhere stops being a motif.

/ Evidence over assertion: The interface shows numbers, dates and documents
  rather than adjectives. Where two facts differ — committed and settled
  (§14.1) — it shows both rather than reconciling them into one comfortable
  figure.

/ Accessible by construction: Behaviour comes from primitives that are
  accessible before they are styled (§5.10), so compliance is the starting
  state rather than a retrofit.

== Design Tokens

The system is defined as tokens, not as decisions made per component. Every
value below has exactly one definition.

#figure(
  table(
    columns: (34mm, 30mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Token], [Value], [Role]),
    [`--color-ink`], [`#241C14`], [Body text. A warm near-black; pure black
      reads as harsh against a warm ground.],
    [`--color-text-secondary`], [`#71614C`], [Supporting text, labels.],
    [`--color-bronze`], [`#8B4F2A`], [Primary accent: structure, rules,
      emphasis.],
    [`--color-gold`], [`#B08A3F`], [Secondary accent, used rarely. Gold at
      volume looks cheap; at low volume it looks expensive.],
    [`--color-bg`], [`#F6F2E7`], [Page ground. Warm cream rather than white.],
    [`--color-surface`], [`#FCFAF3`], [Raised surfaces — cards, plates.],
    [`--color-border`], [`#E3D9C4`], [Hairlines and dividers.],
  ),
  caption: [Colour tokens. A dark-mode set exists in the product with the same
    role assignments.],
)

#figure(
  table(
    columns: (34mm, 40mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Token], [Family], [Role]),
    [`--font-heading-en`], [Cinzel], [Display only: page titles and the
      wordmark. Never in running text — it is an inscriptional capital face and
      unreadable at paragraph size.],
    [`--font-body-en`], [Karla], [Interface text, labels, controls.],
    [`--font-numerals`], [Spectral], [Figures and long-form reading.],
    [`--font-heading-ar`], [Aref Ruqaa], [Arabic display.],
    [`--font-body-ar`], [Cairo], [Arabic interface text.],
  ),
  caption: [Typographic tokens.],
)

#let _swatch(fill, name, hex, dark: false) = block(
  width: 100%,
  {
    block(width: 100%, height: 17mm, fill: fill, stroke: 0.5pt + border)
    v(1.6mm)
    eyebrow(name, size: 6.2pt)
    v(0.5mm)
    text(font: mono-font, size: 7pt, fill: muted)[#hex]
  },
)

#figure(
  grid(
    columns: (1fr,) * 4,
    column-gutter: 4mm,
    row-gutter: 6mm,
    _swatch(ink, "ink", "#241C14"),
    _swatch(muted, "text-secondary", "#71614C"),
    _swatch(bronze, "bronze", "#8B4F2A"),
    _swatch(gold, "gold", "#B08A3F"),
    _swatch(paper, "bg", "#F6F2E7"),
    _swatch(surface, "surface", "#FCFAF3"),
    _swatch(border, "border", "#E3D9C4"),
    block(width: 100%, {
      block(
        width: 100%,
        height: 17mm,
        fill: paper,
        stroke: 0.5pt + border,
        inset: 3mm,
        {
          set text(size: 6.5pt, fill: ink)
          [Ink on ground]
          linebreak()
          text(fill: muted)[Secondary on ground]
          linebreak()
          text(fill: bronze, weight: 700)[Bronze accent]
        },
      )
      v(1.6mm)
      eyebrow("contrast check", size: 6.2pt)
      v(0.5mm)
      text(font: mono-font, size: 7pt, fill: muted)[≥ 4.5:1]
    }),
  ),
  caption: [The palette, printed from the token definitions themselves. The
    final cell is the contrast pairing that §8.7 depends on.],
)

#figure(
  block(width: 100%, {
    let row(label, body) = {
      grid(
        columns: (26mm, 1fr),
        column-gutter: 5mm,
        align: (left + horizon, left + horizon),
        eyebrow(label, size: 6.2pt),
        body,
      )
      v(2.5mm)
      line(length: 100%, stroke: 0.4pt + border)
      v(2.5mm)
    }
    row("display / cinzel", text(font: display-font, size: 21pt, weight: 600, tracking: 0.04em)[Ventures seeking capital])
    row("heading / karla", text(font: heading-font, size: 13pt, weight: 700)[Funding totals are derived])
    row("body / spectral", text(font: body-font, size: 10.5pt)[An approved commitment is not a funded one — the platform shows both figures.])
    row("label / karla", eyebrow("moderation status", size: 7.5pt))
    row("mono / code", text(font: mono-font, size: 8.5pt, fill: bronze)[FundingMath.RaisedAsync()])
  }),
  caption: [The type scale, set in the faces the product loads.],
)

#note[
  Both figures above are *rendered from the tokens*, not pictures of them. The
  swatches are filled with the same colour values the product uses and the
  specimen is set in the same Cinzel, Karla and Spectral the product loads. A
  design system that cannot be applied outside its original medium has not been
  abstracted properly — so this book is the test of its own claim.
]

*Spacing and radii.* Spacing follows a 4-pixel base scale. Radii are small and
uniform; the chamfer, not rounding, is what carries character.

== Component Library

Components come from shadcn/ui: source files copied into the repository rather
than a dependency (§5.10). Each is composed of Radix primitives that supply
behaviour and are styled entirely with the tokens above.

The consequence worth noting is ownership. A component that misbehaves is
modified directly rather than overridden from outside, which means the code
that governs the interface is code the project can read. The cost is
maintenance: an upstream fix does not arrive automatically.

*Composition over configuration.* Components are built to be composed rather
than to accept a large option surface. A card that takes fifteen props to cover
every use eventually covers none of them well; a card that composes from a
header, a body and a footer covers all of them.

== The System in Use

A design system is only a system if the same tokens hold across every axis the
product varies on. This one varies on two: *theme* and *language*. Both are
shown below on the same surface, so the comparison is of the system rather than
of two screens.

#figure(
  image("/assets/screenshots/landing-en-light.png", width: 100%),
  caption: [The landing page. Cinzel at display size, the gold accent used once,
    and an image-led composition — the four principles of §8.1 in one frame.],
)

=== The theme axis

#figure(
  grid(
    columns: (1fr, 1fr),
    column-gutter: 3mm,
    image("/assets/screenshots/projects-en-light.png", width: 100%),
    image("/assets/screenshots/projects-en-dark.png", width: 100%),
  ),
  caption: [The venture listing under the light and dark token sets. Every
    colour is a token with the same *role* in both; nothing is re-chosen per
    theme (§8.2).],
)

The two are not separately designed screens. Each colour resolves through the
same semantic token — ground, surface, ink, accent — against a different value
set. This is what §18.6 records going wrong once: a token resolved against the
root rather than its surface inverted, and text disappeared into its own
background.

=== The language axis

#figure(
  grid(
    columns: (1fr, 1fr),
    column-gutter: 3mm,
    image("/assets/screenshots/projects-en-light.png", width: 100%),
    image("/assets/screenshots/projects-ar-light.png", width: 100%),
  ),
  caption: [The same surface in English and Arabic. The layout mirrors,
    the display face changes to Aref Ruqaa, and the information is identical.],
)

Three things change and one does not. The writing direction flips, so the
layout mirrors — navigation, filters, progress bars and the whole grid. The
display face changes to the Arabic pair in §8.2, because Cinzel has no Arabic.
Numerals and Latin proper nouns stay left-to-right inside right-to-left text,
which the layout has to tolerate rather than fight.

What does not change is the information. Both captures show the same twenty-one
ventures, the same filters and the same funding figures.

=== Mobile

#figure(
  grid(
    columns: (1fr, 1fr),
    column-gutter: 6mm,
    image("/assets/screenshots/landing-en-light-mobile.png", width: 100%),
    image("/assets/screenshots/landing-ar-dark-mobile.png", width: 100%),
  ),
  caption: [The landing page at 390 px, in English light and Arabic dark — both
    varying axes at once. The composition rearranges; nothing is removed
    (§8.6).],
)

=== A designed failure state

#figure(
  image("/assets/screenshots/projects.png", width: 100%),
  caption: [The same listing captured with the API stopped. What is visible is
    the *error state*: a designed surface with a stated cause and a single
    recovery action, not a blank page or a raw message (§8.8).],
)

This capture is deliberate. It is the surface a user meets when something has
gone wrong — which is exactly when a platform handling money is being judged —
and it is the state most interface galleries omit, because producing it is
inconvenient.

== From Wireframe to Interface

Design proceeded in three passes, and the middle one is the one usually skipped.

+ *Structure.* Low-fidelity layouts establishing what is on each screen and in
  what order of importance, with no colour and no type decisions. Most
  hierarchy problems are visible and cheap to fix at this stage.
+ *System.* The tokens above, decided once against representative screens
  rather than negotiated per screen. This is the pass that prevents a system
  from becoming a collection.
+ *Interface.* High-fidelity screens composed from the system.

Working in this order means visual revision is revision of *tokens*, which
propagates, rather than revision of screens, which does not.

== User Flows

Three flows received explicit design attention because each is a point where a
user can be lost.

/ Registration to first meaningful action: Registration, verification and
  onboarding are separate steps, and onboarding asks only for what makes the
  platform useful immediately. Every additional field before first value is a
  point of abandonment.

/ Discovery to commitment: Listing, detail, commitment, approval, checkout.
  The state of a commitment is legible at every step, because a user who
  cannot tell whether their money has moved will assume the worst.

/ Submission to publication: Draft, submit, review, published — with the
  venture's moderation state visible to its founder throughout. A submission
  that disappears into a queue with no feedback produces support requests.

== Responsive Strategy

The interface is designed from 360 px to 1920 px (NFR-14), mobile-first: the
narrow layout is the base and wider layouts add, rather than the reverse.

The distinction that matters is between *responsive* and *adaptive*. The layout
responds continuously; the information does not change by breakpoint. A
narrow-screen user sees the same facts as a wide-screen one, differently
arranged. Hiding information on small screens is a decision that a mobile user
needs less — which for a user checking whether their investment settled is
plainly false.

Data-dense surfaces — dashboards, administrative tables — are where this is
hardest. Wide tables scroll within their own container rather than forcing the
page to scroll horizontally, which keeps navigation and page structure in place.

=== Bidirectional layout

Language is a second responsive axis, and it is the one more often forgotten.
Selecting Arabic sets the document direction, and the entire layout mirrors:
navigation, filter rows, progress fills, icon placement and the reading order
of every grid.

Three rules make this work rather than merely function:

+ *Layout is expressed in logical properties, not physical ones.* Spacing is
  declared as start and end rather than left and right, so mirroring is a
  property of the direction rather than a second set of rules.
+ *The type stack changes with the language.* Cinzel has no Arabic coverage, so
  the display role resolves to Aref Ruqaa and body text to Cairo (§8.2). The
  *role* is constant; the face is not.
+ *Mixed direction is tolerated, not fought.* Numerals, currency and Latin
  proper nouns remain left-to-right inside right-to-left text. A funding figure
  reading `$0 of $400K` inside an Arabic sentence is correct, and the layout
  must not try to reverse it.

The figures in §8.3 show the same surface on both sides of this axis.

== Accessibility Compliance

The target is WCAG 2.1 AA (NFR-13). Compliance is claimed here only where it
was checked.

#figure(
  table(
    columns: (40mm, 1fr, 22mm),
    align: (left + top, left + top, left + top),
    table.header([Criterion], [Position], [State]),
    [Colour contrast],
    [Ink on ground and secondary text on ground both exceed 4.5:1. The gold
     accent is not used for text at small sizes, where it would not pass.],
    [Verified],
    [Keyboard operation],
    [All interactive elements are reachable and operable by keyboard; focus
     order follows document order.],
    [Verified],
    [Focus visibility],
    [A visible focus ring is never removed. It is restyled to match the
     system, not suppressed.],
    [Verified],
    [Semantic structure],
    [Headings are hierarchical; landmarks are present; controls are real
     controls rather than styled containers.],
    [Verified],
    [Names, roles and values],
    [Supplied by the Radix primitives rather than added by hand.],
    [Inherited],
    [Motion sensitivity],
    [Animation respects the reduced-motion preference.],
    [Verified],
    [Screen reader testing],
    [Spot-checked on primary flows; not exhaustive across every surface.],
    [Partial],
  ),
  caption: [Accessibility position by criterion, including one that is only
    partial.],
)

The final row is the honest one. A blanket claim of AA conformance across
sixty-five routes would not be supportable, and §19.4 records this as a
limitation rather than absorbing it into a claim.

== Motion and Interaction

Motion has one job: to explain what changed. Every transition in the system
answers "where did this come from" or "what just happened", and anything that
does not is removed.

Three rules apply. Durations are short — long enough to be perceived, short
enough never to be waited on. Easing decelerates, because motion that stops
abruptly reads as mechanical. And motion respects the reduced-motion preference,
which is a correctness requirement rather than a nicety: for some users,
animation is not decoration but a symptom trigger.

*States are designed, not defaulted.* Loading, empty and error states are part
of the design system rather than afterthoughts. An empty watchlist explains what
a watchlist is for; a failed payment says what happened and what to do. These
are the surfaces a user meets when something has gone wrong, which is exactly
when a platform handling money is being judged.
