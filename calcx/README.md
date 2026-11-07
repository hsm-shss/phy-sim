# fx-50FH II web — phy-sim MIT fork

Working browser recreation of the CASIO fx-50FH II programmable scientific calculator
(unofficial; not endorsed by CASIO or HKEAA).

**Live on this site:** [calcx/](./index.html) · Hub: [phy-sim](../index.html)

## Provenance

| | |
|---|---|
| Upstream | [throwingogo-hub/fx-50fh-ii](https://github.com/throwingogo-hub/fx-50fh-ii) |
| Forked commit | `84c53951d58e0ee890eae5fd96f248aefdc8db37` |
| License | MIT — see [LICENSE](./LICENSE) |
| Attribution | [NOTICE](./NOTICE) |

Copyright (c) 2026 throwingogo-hub. The MIT copyright and permission notices are retained.

## What this fork includes

- Full static app: `index.html`, `css/`, `js/` (ES modules), Program Studio, HKDSE program library
- Vendored locally — no runtime dependency on school CDNs or other hosts
- Generated faceplate PNGs used by the shell CSS (LCD + hit targets are live canvas/DOM layers)
- Tests, tools, `programs.md`, and the curated S5 program library PDF from upstream

## What was excluded

- **`assets/fx-50fh-ii.png`** — CASIO product photograph; upstream LICENSE states it is **not** covered by MIT. Not copied.
- **`assets/fx-50fh-ii-generated-green.png`** — intermediate green-screen asset; not required to run (transparent cutout is used instead).

## Run locally

No build step. Serve this folder over HTTP (ES modules will not load from `file://`):

```bash
python3 -m http.server 8142 --directory .
# open http://127.0.0.1:8142/
```

## Related page on phy-sim

- Classroom original (separate codebase): [`../dse_scientific_calc.html`](../dse_scientific_calc.html)

## Disclaimer

Independent unofficial simulator. Model names and trademarks belong to their owners.
Important results should be checked on a physical calculator.
