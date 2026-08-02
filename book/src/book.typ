#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

#show: book.with(title: "Vestora — An Equity Crowdfunding Platform")

// ── Cover and roster ────────────────────────────────────────────────
#cover(
  title: "Vestora — An Equity Crowdfunding Platform for Founders and Investors",
  subtitle: "Graduation Project Documentation",
  university: "Menoufia University",
  faculty: "Faculty of Computers and Information",
  department: "Department of Computer Science",
  degree: "Submitted in partial fulfilment of the requirements for the degree of Bachelor of Science",
  supervisor: "Dr. Khaled Amin",
  date: "September 2026",
)

#team-page()

// ── Front matter (roman folios) ─────────────────────────────────────
#set page(numbering: "i")
#counter(page).update(1)

// Scoped so front-matter headings are neither numbered nor listed in the
// contents — otherwise the Executive Summary's sections appear as "0.1".
#[
  #set heading(numbering: none, outlined: false)
  #include "frontmatter/declaration.typ"
  #include "frontmatter/acknowledgment.typ"
  #include "frontmatter/abstract-en.typ"
  #include "frontmatter/abstract-ar.typ"
  #include "frontmatter/executive-summary.typ"
  #include "frontmatter/how-to-read.typ"
  #include "frontmatter/contents.typ"
]

// ── Body (arabic folios) ────────────────────────────────────────────
#pagebreak(weak: true)
#set page(numbering: "1")
#counter(page).update(1)

#part(1, "Foundation", blurb: [
  Why the project exists, what already exists in the field, and how the work
  was organised.
])
#include "chapters/ch01-introduction.typ"
#include "chapters/ch02-domain-and-related-work.typ"
#include "chapters/ch03-methodology.typ"

#part(2, "Analysis and Design", blurb: [
  From elicited requirements to the technology choices, the architecture, the
  data model and the interface system built on top of them.
])
#include "chapters/ch04-requirements.typ"
#include "chapters/ch05-technology-decisions.typ"
#include "chapters/ch06-architecture.typ"
#include "chapters/ch07-database.typ"
#include "chapters/ch08-design-system.typ"

#part(3, "Implementation", blurb: [
  The API surface, the security model, the payment and real-time subsystems,
  and a walkthrough of the platform's features as they were built.
])
#include "chapters/ch09-api.typ"
#include "chapters/ch10-security.typ"
#include "chapters/ch11-payments.typ"
#include "chapters/ch12-realtime.typ"
#include "chapters/ch13-features-identity.typ"
#include "chapters/ch14-features-investment.typ"

#part(4, "Quality and Delivery", blurb: [
  How the system was verified, how it is deployed and operated, and how it
  performs under load.
])
#include "chapters/ch15-testing.typ"
#include "chapters/ch16-deployment-operations.typ"
#include "chapters/ch17-performance.typ"

#part(5, "Closure", blurb: [
  What proved hard, what the results show, and what comes next.
])
#include "chapters/ch18-challenges.typ"
#include "chapters/ch19-evaluation.typ"
#include "chapters/ch20-conclusion.typ"

// ── Back matter ─────────────────────────────────────────────────────
#include "backmatter/references.typ"

#part(6, "Appendices", blurb: [
  Reference material held out of the chapters so the argument stays readable.
])
#appendix-mode()
#include "appendices/app-a-api.typ"
#include "appendices/app-b-schema.typ"
#include "appendices/app-c-traceability.typ"
#include "appendices/app-d-tests.typ"
#include "appendices/app-e-screenshots.typ"
#include "appendices/app-f-listings.typ"
#include "appendices/app-g-setup.typ"
#include "appendices/app-h-manual.typ"
