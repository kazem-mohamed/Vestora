#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

Entries are held in `src/backmatter/refs.bib` and rendered by the typesetter, so
a citation in the text and its entry here cannot disagree. Download pages are
not references; installation sources are in @app:setup.

#bibliography(
  "refs.bib",
  style: "ieee",
  title: [References],
  full: true,
)
