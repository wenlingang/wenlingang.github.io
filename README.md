# wenlingang.github.io

Personal homepage. Plain static files, no build step:

- `index.html`: page structure and project cards
- `assets/core.js`: shared helpers, status pill and particle field
- `assets/site.js`: the intro and the agent steps
- `assets/site.css`: styles

To edit the intro, change `BIO` at the top of `assets/site.js`, plus the `.bio-fallback` paragraphs in `index.html` that show without JS. To add a project, copy an `<a class="card">` inside `.grid`.

Preview locally:

```shell
python3 -m http.server 8000
```
