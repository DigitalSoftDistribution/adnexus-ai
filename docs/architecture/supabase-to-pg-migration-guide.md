# Supabase JS to pg Pool Migration Guide

**Last Updated:** 2026-05-30

## Why Migrate

All Clean Architecture repositories use raw pg Pool via `src/infrastructure/database/connection.ts`. Legacy routes use the Supabase JS client. This guide shows how to convert each Supabase query pattern to raw SQL.

## Setup

All migrated code uses the `query` helper:

```typescript
import { query } from '../database/connection';
```

## Pattern Reference

### Simple SELECT

```typescript
// BEFORE: Supabase JS
const { data, error } = await supabase
  .from('campaigns')
  .select('*')
  .eq('workspace_id', workspaceId)
  .eq('status', 'active');

// AFTER: pg Pool
const { rows } = await query<Campaign>(
  `SELECT * FROM campaigns WHERE workspace_id = $1 AND status = $2`,
  [workspaceId, 'active'],
);
```

### SELECT with JOIN

```typescript
// BEFORE: Supabase JS
const { data } = await supabase
  .from('campaigns')
  .select('*, ad_accounts(platform)')
  .eq('workspace_id', workspaceId);

// AFTER: pg Pool
const { rows } = await query<Campaign>(
  `SELECT c.*, a.platform as account_platform
   FROM campaigns c
   JOIN ad_accounts a ON a.id = c.ad_account_id
   WHERE c.workspace_id = $1`,
  [workspaceId],
);
```

### INSERT with RETURNING

```typescript
// BEFORE
const { data, error } = await supabase
  .from('campaigns')
  .insert({ workspace_id: wid, name: 'Test', status: 'draft' })
  .select()
  .single();

// AFTER
const { rows } = await query<Campaign>(
  `INSERT INTO campaigns (workspace_id, name, status)
   VALUES ($1, $2, $3) RETURNING *`,
  [wid, 'Test', 'draft'],
);
return rows[0];
```

### UPDATE with RETURNING

```typescript
// BEFORE
const { data } = await supabase
  .from('campaigns')
  .update({ name: newName, status: 'paused' })
  .eq('id', id)
  .select()
  .single();

// AFTER
const { rows } = await query<Campaign>(
  `UPDATE campaigns SET name = $1, status = $2 WHERE id = $3 RETURNING *`,
  [newName, 'paused', id],
);
return rows[0];
```

### DELETE

```typescript
// BEFORE
const { error } = await supabase
  .from('campaigns')
  .delete()
  .eq('id', id);

// AFTER
const { rowCount } = await query(
  `DELETE FROM campaigns WHERE id = $1`,
  [id],
);
return (rowCount ?? 0) > 0;
```

### Dynamic Filters with Pagination

```typescript
// BEFORE
let q = supabase.from('campaigns').select('*', { count: 'exact' });
if (status) q = q.eq('status', status);
if (search) q = q.ilike('name', `%${search}%`);
const { data, count } = await q.range(offset, offset + limit - 1);

// AFTER
const conditions: string[] = ['workspace_id = $1'];
const params: unknown[] = [workspaceId];
let idx = 1;

if (status) {
  conditions.push(`status = $${++idx}`);
  params.push(status);
}
if (search) {
  conditions.push(`name ILIKE $${++idx}`);
  params.push(`%${search}%`);
}

const whereClause = conditions.join(' AND ');
const { rows: countRows } = await query<{ count: string }>(
  `SELECT COUNT(*)::text as count FROM campaigns WHERE ${whereClause}`,
  params,
);
const total = parseInt(countRows[0].count, 10);

params.push(limit, offset);
const { rows } = await query<Campaign>(
  `SELECT * FROM campaigns WHERE ${whereClause}
   ORDER BY created_at DESC LIMIT $${++idx} OFFSET $${++idx}`,
  params,
);
```

### Partial UPDATE (dynamic fields)

```typescript
// BEFORE
const updates: Record<string, unknown> = {};
if (name) updates.name = name;
if (status) updates.status = status;
await supabase.from('campaigns').update(updates).eq('id', id);

// AFTER
const setClauses: string[] = [];
const params: unknown[] = [id];
let idx = 1;

for (const [key, value] of Object.entries(updates)) {
  if (value !== undefined) {
    const column = camelToSnake(key);
    setClauses.push(`${column} = $${++idx}`);
    params.push(value);
  }
}

if (setClauses.length === 0) return findById(id);

const { rows } = await query<Campaign>(
  `UPDATE campaigns SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
  params,
);
return rows[0] ?? null;
```

### Aggregation

```typescript
// BEFORE
const { data } = await supabase
  .from('campaigns')
  .select('status, count(*)')
  .eq('workspace_id', workspaceId);

// AFTER
const { rows } = await query(
  `SELECT status, COUNT(*)::int as count
   FROM campaigns
   WHERE workspace_id = $1
   GROUP BY status`,
  [workspaceId],
);
```

### Transactions

```typescript
// BEFORE - Supabase JS does not support transactions directly
// Had to use RPC or multiple sequential calls

// AFTER
import { transaction } from '../database/connection';

await transaction(async (client) => {
  await client.query(`UPDATE campaigns SET status = $1 WHERE id = $2`, ['paused', campaignId]);
  await client.query(`INSERT INTO audit_log (action, entity_id) VALUES ($1, $2)`, ['campaign.paused', campaignId]);
});
```

## Column Naming Convention

Database columns are `snake_case`. Domain entity properties are `camelCase`. Repositories handle the mapping:

```typescript
private camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
// workspaceId -> workspace_id
// createdAt -> created_at
```

## Error Handling

```typescript
// BEFORE: Supabase returns { data, error }
if (error) {
  if (error.code === 'PGRST116') return null; // not found
  throw new Error(error.message);
}

// AFTER: pg throws on error, caught by query() helper which logs and re-throws
// Use domain errors for business logic:
import { NotFoundError } from '../../domain/value-objects/Result';
const result = await findById(id);
if (!result) throw new NotFoundError('Campaign');
```

## Authorization Note

Supabase JS automatically applies Row Level Security (RLS) based on the auth context. With pg Pool, authorization must be handled in the application layer:

- Use cases perform role checks before operations
- Repository methods filter by `workspace_id` to ensure tenant isolation
- The `requireAuth` middleware sets `req.user` with workspace and role context
