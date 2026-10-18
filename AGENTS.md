<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- All twin metrics (risk, reliability, completeness, freshness) are derived in `src/lib/twin/calc.ts` from the single observation store in `src/lib/twin/store.tsx`; never hardcode dashboard numbers — keeps every page consistent after edits.
- Missing readings are stored as `value: null` markers and never imputed — core research principle of the prototype.
- Risk score and Data Reliability Indicator stay separate; missing inputs are excluded from the score, not penalised.
- Demo state persists in localStorage only; no backend — prototype requires no accounts or APIs.
