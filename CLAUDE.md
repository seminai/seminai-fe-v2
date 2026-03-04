# seminai-fe-v2 — Frontend Rules

Stack: **React 18 + TypeScript + Vite + shadcn/ui + TanStack Query**

> Shared conventions (file size, no `any`, DRY, English) are in the root `CLAUDE.md`.
> If a request conflicts with these rules, propose the closest compliant alternative.

---

## Atomic Design (required)

| Level               | Examples                                     |
| ------------------- | -------------------------------------------- |
| **Atoms**           | Button wrapper, Input wrapper, Icon, Badge   |
| **Molecules**       | SearchBar, FormField, LabeledSwitch          |
| **Organisms**       | UsersTable, FiltersPanel, EditUserDialog     |
| **Pages/Templates** | Route-level composition + data orchestration |

**Rule:** server-data orchestration belongs in pages/templates or hooks — never in atoms.

### Folder structure

```
src/
├── components/
│   ├── atoms/
│   ├── molecules/
│   └── organisms/
├── pages/
├── hooks/       # TanStack Query hooks (useXxxQuery, useXxxMutation)
├── services/    # API client and endpoints
├── types/       # DTOs, domain types
└── utils/
```

---

## Component guidelines

- Prefer **presentational** components receiving props.
- Pages handle: routing params, query/mutation orchestration, page-level state.
- Avoid prop-drilling — extract organisms or use context sparingly.
- **Server state:** TanStack Query only. Do not duplicate into local state.
- **Local UI state:** `useState`.
- **Derived state:** compute in render or `useMemo` — never store in state.
- Memoization (`React.memo`, `useCallback`, `useMemo`) only when measurable.

---

## useEffect rules (STRICT)

Only for **true side effects**: subscriptions, imperative DOM, syncing with external systems.

- Never for derivations — use `useMemo` or compute in render.
- Always include correct dependencies.
- Always cleanup subscriptions in the return function.
- **Never** call async directly in the effect callback:

```ts
useEffect(() => {
  let active = true;
  (async () => {
    const res = await doWork();
    if (!active) return;
    setState(res);
  })();
  return () => {
    active = false;
  };
}, [deps]);
```

- Before adding an effect that reacts to query data, ask: "Can I use `select`, derived values, or render logic instead?"

---

## TanStack Query standards

### Query keys

```ts
["users", { page, pageSize, search }][("user", userId)]; // list // detail
```

Keys must be stable, serializable, and typed.

### Hooks pattern

Create typed hooks in `src/hooks/`, keep API calls in `src/services/`:

```ts
useUsersQuery(params);
useUserQuery(userId);
useUpdateUserMutation();
```

### Mutations + cache updates

After update/create/delete the cache must be correct without a full refresh.

```ts
onSuccess: (updated: User) => {
  // 1. detail
  queryClient.setQueryData(['user', updated.id], updated);
  // 2. lists
  queryClient.setQueriesData({ queryKey: ['users'] }, (old) => {
    if (Array.isArray(old)) return old.map(u => u.id === updated.id ? updated : u);
    if (Array.isArray(old?.items)) return { ...old, items: old.items.map(...) };
    return old;
  });
  // 3. invalidate only if deterministic update is impossible
}
```

### Invalidation

- Use the smallest scope: `queryClient.invalidateQueries({ queryKey: ['users'] })`.
- No blanket invalidations.

---

## Error / Loading / Empty states (mandatory)

Every query-driven UI must handle:

- **Loading:** `Skeleton` (shadcn/ui) or equivalent.
- **Error:** `Alert` or toast + retry option.
- **Empty:** clear empty state + next action.

---

## Styling

- Tailwind classes only; avoid custom CSS unless necessary.
- Do not re-style shadcn/ui components inconsistently — extend via props/classes.

---

## Definition of Done

- [ ] File <= 300 lines (or split into `Component.parts.tsx` / `useComponent.ts`)
- [ ] `useEffect` only for true side-effects, correct deps + cleanup
- [ ] TanStack Query keys stable and typed
- [ ] Cache updated after mutations (detail → lists → invalidate if needed)
- [ ] Atomic Design boundaries respected
- [ ] Existing components/hooks reused before creating new ones
- [ ] Loading / error / empty states implemented
- [ ] No `any` without justification in a comment
