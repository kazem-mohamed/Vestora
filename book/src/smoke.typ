#import "../lib/vestora.typ": *
#import "../lib/theme.typ": *

#cover(
  title: "Vestora — An Equity Crowdfunding Platform",
  subtitle: "Graduation Project Documentation",
  university: "Menoufia University",
  faculty: "Faculty of Computers and Information",
  department: "Department of Computer Science",
  degree: "Submitted in partial fulfilment of the requirements for the degree of B.Sc.",
  supervisor: "Dr. Khaled Amin",
  date: "September 2026",
)

#team-page()

#show: book.with(title: "Vestora")

#counter(page).update(1)
#set page(numbering: "1")

#part(1, "Foundation", blurb: [Context, prior art and the way the project was run.])

= Introduction

== Background and Motivation

This is a smoke test paragraph to verify body typography, justification and
the general colour of the page. Vestora connects founders raising capital with
investors seeking early-stage opportunities, and this book documents how it was
designed, built and evaluated. Inline code such as `FundingMath.Recompute()`
should sit quietly in the line.

=== A third-level heading

Another paragraph follows, long enough to wrap across several lines so that the
leading and the measure can be judged properly rather than guessed at from a
single short line of text.

#figure(
  table(
    columns: (1fr, 1fr, 1fr),
    table.header([Criterion], [React + Next.js], [Angular]),
    [Rendering model], [Hybrid SSR/RSC], [Client SPA],
    [Component ecosystem], [shadcn / Radix], [Material],
  ),
  caption: [Extract from the frontend framework evaluation.],
)

#figure(
  ```cs
  [HttpPost("{projectId}/invest")]
  public async Task<IActionResult> Invest(int projectId, InvestDto dto)
  {
      var project = await _projects.GetForInvestmentAsync(projectId);
      if (project is null) return NotFound();
      return Ok(await _investments.OpenAsync(project, dto));
  }
  ```,
  caption: [Investment endpoint, reduced to the path that matters.],
)

#adr(
  "07",
  "Funding totals are derived, never stored",
  background: [Two independent writers updated a cached `RaisedAmount` column.],
  decision: [`FundingMath` recomputes totals from settled payments on read.],
  consequences: [One source of truth; a small read cost on project pages.],
)

#note[
  Listings are real text throughout this book. Nothing that can be typed is
  reproduced as an image.
]

== A second section

Text after the plate, to confirm vertical rhythm is restored correctly.

#figure(
  image("../assets/diagrams/out/c4-container.svg", width: 92%),
  caption: [Container view of the Vestora platform and its external dependencies.],
)
