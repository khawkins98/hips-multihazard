# Releasing

Releases are cut from `main` after one or more related PRs have been merged. Not every merge needs a release — batch related changes together when it makes sense.

## Versioning

This project uses [Semantic Versioning](https://semver.org/):

| Change type | Version bump |
|---|---|
| Breaking change to URL state, data format, or public API | Major (`x.0.0`) |
| New view, new tool panel, or significant new capability | Minor (`x.y.0`) |
| Bug fix, visual polish, dependency update, docs | Patch (`x.y.z`) |

## Cutting a release

1. On `main`, run `npm version patch` (or `minor` / `major`). This updates `package.json`, commits the change, and creates the tag in one step:
   ```bash
   npm version patch   # or minor / major
   git push origin main --follow-tags
   ```
2. Go to **GitHub → Releases → Draft a new release**, select the tag just pushed, and write the release notes (see style guide below).
3. Publish. The deploy workflow already fired from the `git push` in step 1; the GitHub Release you're publishing here is changelog documentation only, not a deploy trigger.

## Release notes style

Release notes should describe **what changed and why** in plain language — not a list of commit messages. A reader who hasn't followed the PRs should understand what's new and whether it affects them.

**Patch release** — concise bullet list under `## What's changed`:

```markdown
## What's changed

- **Brief headline**: One sentence explaining the change and its impact.
- **Another fix**: Same pattern — bold label, plain-English description.
```

**Minor or major release** — narrative prose grouped by feature area, with a screenshot for any visual change and a `Full Changelog` link at the end:

```markdown
<screenshot or gif of the most significant change>

### Feature area heading

Two or three sentences explaining what this area does now and why it matters.
Use prose, not bullets, unless you're listing genuinely enumerable things (e.g. a
fallback priority chain).

### Another area

...

**Full Changelog**: https://github.com/khawkins98/hips-multihazard/compare/vPREV...vNEW
```

**Things to avoid in release notes:**
- Raw commit messages or PR titles as bullets
- Implementation details that don't affect users (e.g. "refactored X into Y module")
- Version numbers of updated dependencies unless the update has a user-visible effect
