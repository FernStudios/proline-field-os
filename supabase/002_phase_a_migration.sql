-- =============================================================================
-- Proline Field OS — Phase A Data Migration
-- Reads from existing user_data JSON blobs → populates new relational tables
-- Run AFTER 001_relational_schema.sql
-- Safe to re-run: uses ON CONFLICT DO NOTHING / DO UPDATE throughout
-- =============================================================================

-- This migration runs as a DO block so we can use variables and loops.
-- It reads every row in user_data, bootstraps an account for that user,
-- then inserts all their operational data into the new tables.

do $$
declare
  r           record;
  v_account_id uuid;
  v_user_email text;
  v_job       jsonb;
  v_inv       jsonb;
  v_payment   jsonb;
  v_exp       jsonb;
  v_crew_m    jsonb;
  v_run       jsonb;
  v_lead      jsonb;
  v_est       jsonb;
  v_contract  jsonb;
  v_co        jsonb;
  v_ticket    jsonb;
  v_doc       jsonb;
  v_tmpl_key  text;
  v_tmpl_val  jsonb;
begin

  -- Loop over every user in user_data
  for r in select ud.user_id, ud.db, au.email
           from user_data ud
           left join auth.users au on au.id = ud.user_id
  loop

    v_user_email := coalesce(r.email, '');

    -- ── 1. Bootstrap account ────────────────────────────────────────
    v_account_id := bootstrap_account(
      r.user_id,
      v_user_email,
      coalesce(r.db->'settings'->'adminSettings'->>'ownerName', '')
    );

    -- ── 2. Settings ─────────────────────────────────────────────────
    insert into settings (
      account_id, co_name, co_phone, co_email, co_city, license,
      primary_state, tagline, contract_defaults, payment_config,
      job_types, admin_settings, role_permissions
    )
    values (
      v_account_id,
      coalesce(r.db->'settings'->>'coName', ''),
      coalesce(r.db->'settings'->>'coPhone', ''),
      coalesce(r.db->'settings'->>'coEmail', ''),
      coalesce(r.db->'settings'->>'coCity', ''),
      coalesce(r.db->'settings'->>'license', ''),
      coalesce(r.db->'settings'->>'primaryState', 'SC'),
      coalesce(r.db->'settings'->>'tagline', ''),
      coalesce(r.db->'settings'->'contractDefaults', '{}'::jsonb),
      coalesce(r.db->'settings'->'paymentConfig', '{}'::jsonb),
      coalesce(r.db->'settings'->'jobTypes', '[]'::jsonb),
      coalesce(r.db->'settings'->'adminSettings', '{}'::jsonb),
      coalesce(r.db->'rolePermissions', '{}'::jsonb)
    )
    on conflict (account_id) do update set
      co_name           = excluded.co_name,
      co_phone          = excluded.co_phone,
      co_email          = excluded.co_email,
      co_city           = excluded.co_city,
      license           = excluded.license,
      primary_state     = excluded.primary_state,
      tagline           = excluded.tagline,
      contract_defaults = excluded.contract_defaults,
      payment_config    = excluded.payment_config,
      job_types         = excluded.job_types,
      admin_settings    = excluded.admin_settings,
      role_permissions  = excluded.role_permissions;

    -- ── 3. Counters ─────────────────────────────────────────────────
    insert into counters (account_id, next_con, next_co, next_inv, next_est)
    values (
      v_account_id,
      coalesce((r.db->>'_nextCon')::int, 1001),
      coalesce((r.db->>'_nextCO')::int,  1001),
      coalesce((r.db->>'_nextInv')::int, 1001),
      coalesce((r.db->>'_nextEst')::int, 1001)
    )
    on conflict (account_id) do update set
      next_con = excluded.next_con,
      next_co  = excluded.next_co,
      next_inv = excluded.next_inv,
      next_est = excluded.next_est;

    -- ── 4. Jobs ─────────────────────────────────────────────────────
    for v_job in select * from jsonb_array_elements(coalesce(r.db->'jobs', '[]'::jsonb))
    loop
      insert into jobs (
        id, account_id, client, address, phone, email,
        type, state, contract_value, kb_status, prev_kb_status, status,
        portal_token, start_date, end_date, notes,
        tasks, comm_log, materials, assigned_crew,
        created_at, updated_at
      )
      values (
        (v_job->>'id')::uuid,
        v_account_id,
        coalesce(v_job->>'client', ''),
        coalesce(v_job->>'address', ''),
        coalesce(v_job->>'phone', ''),
        coalesce(v_job->>'email', ''),
        coalesce(v_job->>'type', ''),
        coalesce(v_job->>'state', 'SC'),
        coalesce((v_job->>'contractValue')::numeric, 0),
        coalesce(v_job->>'kbStatus', 'new_lead'),
        v_job->>'prevKbStatus',
        coalesce(v_job->>'status', 'active'),
        v_job->>'portalToken',
        (v_job->>'startDate')::date,
        (v_job->>'endDate')::date,
        coalesce(v_job->>'notes', ''),
        coalesce(v_job->'tasks', '[]'::jsonb),
        coalesce(v_job->'commLog', '[]'::jsonb),
        coalesce(v_job->'materials', '[]'::jsonb),
        coalesce(v_job->'assignedCrew', '[]'::jsonb),
        coalesce((v_job->>'created')::timestamptz, now()),
        now()
      )
      on conflict (id) do update set
        kb_status      = excluded.kb_status,
        prev_kb_status = excluded.prev_kb_status,
        status         = excluded.status,
        notes          = excluded.notes,
        tasks          = excluded.tasks,
        comm_log       = excluded.comm_log,
        materials      = excluded.materials,
        assigned_crew  = excluded.assigned_crew,
        updated_at     = now();
    end loop;

    -- ── 5. Estimates ────────────────────────────────────────────────
    for v_est in select * from jsonb_array_elements(coalesce(r.db->'estimates', '[]'::jsonb))
    loop
      insert into estimates (
        id, account_id, job_id, num, total, deposit_amount,
        scope_of_work, exclusions, expiry_date, portal_token,
        status, attorney_ack, document_text, generated_text,
        project_state, created_at
      )
      values (
        (v_est->>'id')::uuid,
        v_account_id,
        (v_est->>'jobId')::uuid,
        coalesce(v_est->>'num', 'EST-0000'),
        coalesce((v_est->>'total')::numeric, 0),
        coalesce((v_est->>'depositAmount')::numeric, 0),
        coalesce(v_est->>'scopeOfWork', ''),
        coalesce(v_est->>'exclusions', ''),
        (v_est->>'expiryDate')::date,
        v_est->>'portalToken',
        coalesce(v_est->>'status', 'draft'),
        v_est->'attorneyAck',
        coalesce(v_est->>'documentText', ''),
        coalesce(v_est->>'generatedText', ''),
        v_est->>'projectState',
        coalesce((v_est->>'created')::timestamptz, now())
      )
      on conflict (id) do nothing;
    end loop;

    -- ── 6. Contracts ────────────────────────────────────────────────
    for v_contract in select * from jsonb_array_elements(coalesce(r.db->'contracts', '[]'::jsonb))
    loop
      insert into contracts (
        id, account_id, job_id, num, status, payment_version,
        contract_value, deposit_amount, warranty_years, project_state,
        attorney_ack, document_text, generated_text,
        version_timestamp, created_at
      )
      values (
        (v_contract->>'id')::uuid,
        v_account_id,
        (v_contract->>'jobId')::uuid,
        coalesce(v_contract->>'num', 'CON-0000'),
        coalesce(v_contract->>'status', 'draft'),
        v_contract->>'paymentVersion',
        coalesce((v_contract->>'contractValue')::numeric, 0),
        coalesce((v_contract->>'depositAmount')::numeric, 0),
        coalesce((v_contract->>'warrantyYears')::int, 1),
        v_contract->>'projectState',
        v_contract->'attorneyAck',
        coalesce(v_contract->>'documentText', ''),
        coalesce(v_contract->>'generatedText', ''),
        (v_contract->>'versionTimestamp')::timestamptz,
        coalesce((v_contract->>'created')::timestamptz, now())
      )
      on conflict (id) do nothing;
    end loop;

    -- ── 7. Change Orders ────────────────────────────────────────────
    for v_co in select * from jsonb_array_elements(coalesce(r.db->'changeOrders', '[]'::jsonb))
    loop
      insert into change_orders (
        id, account_id, job_id, num, co_type, status,
        amount, deposit_amount, description,
        document_text, generated_text, attorney_ack,
        version_timestamp, created_at
      )
      values (
        (v_co->>'id')::uuid,
        v_account_id,
        (v_co->>'jobId')::uuid,
        coalesce(v_co->>'num', 'CO-0000'),
        coalesce(v_co->>'coType', 'customer'),
        coalesce(v_co->>'status', 'pending'),
        coalesce((v_co->>'amount')::numeric, 0),
        coalesce((v_co->>'depositAmount')::numeric, 0),
        coalesce(v_co->>'description', ''),
        coalesce(v_co->>'documentText', ''),
        coalesce(v_co->>'generatedText', ''),
        v_co->'attorneyAck',
        (v_co->>'versionTimestamp')::timestamptz,
        coalesce((v_co->>'created')::timestamptz, now())
      )
      on conflict (id) do nothing;
    end loop;

    -- ── 8. Invoices + Payments ──────────────────────────────────────
    for v_inv in select * from jsonb_array_elements(coalesce(r.db->'invoices', '[]'::jsonb))
    loop
      insert into invoices (
        id, account_id, job_id, num, amount, status,
        due_date, notes, client_name, created_at
      )
      values (
        (v_inv->>'id')::uuid,
        v_account_id,
        nullif(v_inv->>'jobId', '')::uuid,
        coalesce(v_inv->>'num', 'INV-0000'),
        coalesce((v_inv->>'amount')::numeric, 0),
        coalesce(v_inv->>'status', 'unpaid'),
        (v_inv->>'dueDate')::date,
        coalesce(v_inv->>'notes', ''),
        coalesce(v_inv->>'clientName', ''),
        coalesce((v_inv->>'created')::timestamptz, now())
      )
      on conflict (id) do nothing;

      -- Payments nested in invoice
      for v_payment in select * from jsonb_array_elements(coalesce(v_inv->'payments', '[]'::jsonb))
      loop
        insert into payments (
          id, account_id, invoice_id, amount, method, memo, paid_date
        )
        values (
          coalesce(nullif(v_payment->>'id','')::uuid, gen_random_uuid()),
          v_account_id,
          (v_inv->>'id')::uuid,
          coalesce((v_payment->>'amount')::numeric, 0),
          coalesce(v_payment->>'method', 'Other'),
          coalesce(v_payment->>'memo', ''),
          (v_payment->>'date')::date
        )
        on conflict (id) do nothing;
      end loop;
    end loop;

    -- ── 9. Expenses ─────────────────────────────────────────────────
    for v_exp in select * from jsonb_array_elements(coalesce(r.db->'expenses', '[]'::jsonb))
    loop
      insert into expenses (
        id, account_id, job_id, category, description, amount, expense_date, created_at
      )
      values (
        (v_exp->>'id')::uuid,
        v_account_id,
        nullif(v_exp->>'jobId', '')::uuid,
        coalesce(v_exp->>'category', 'Other'),
        coalesce(v_exp->>'description', ''),
        coalesce((v_exp->>'amount')::numeric, 0),
        (v_exp->>'date')::date,
        coalesce((v_exp->>'date')::timestamptz, now())
      )
      on conflict (id) do nothing;
    end loop;

    -- ── 10. Crew ────────────────────────────────────────────────────
    for v_crew_m in select * from jsonb_array_elements(coalesce(r.db->'crew', '[]'::jsonb))
    loop
      insert into crew (
        id, account_id, name, role, phone, email, pay_type, pay_rate, active
      )
      values (
        (v_crew_m->>'id')::uuid,
        v_account_id,
        coalesce(v_crew_m->>'name', ''),
        coalesce(v_crew_m->>'role', 'crew'),
        coalesce(v_crew_m->>'phone', ''),
        coalesce(v_crew_m->>'email', ''),
        coalesce(v_crew_m->>'payType', 'daily'),
        coalesce((v_crew_m->>'payRate')::numeric, 0),
        coalesce((v_crew_m->>'active')::boolean, true)
      )
      on conflict (id) do nothing;
    end loop;

    -- ── 11. Payroll Runs ────────────────────────────────────────────
    for v_run in select * from jsonb_array_elements(coalesce(r.db->'payrollRuns', '[]'::jsonb))
    loop
      insert into payroll_runs (
        id, account_id, run_date, total_labor, owner_draw, entries, notes, created_at
      )
      values (
        (v_run->>'id')::uuid,
        v_account_id,
        coalesce((v_run->>'date')::date, current_date),
        coalesce((v_run->>'totalLabor')::numeric, 0),
        coalesce((v_run->>'ownerDraw')::numeric, 0),
        coalesce(v_run->'entries', '[]'::jsonb),
        coalesce(v_run->>'notes', ''),
        coalesce((v_run->>'date')::timestamptz, now())
      )
      on conflict (id) do nothing;
    end loop;

    -- ── 12. Leads ───────────────────────────────────────────────────
    for v_lead in select * from jsonb_array_elements(coalesce(r.db->'leads', '[]'::jsonb))
    loop
      insert into leads (
        id, account_id, client, phone, email, address,
        stage, source, notes, follow_up_date,
        converted_job_id, created_at
      )
      values (
        (v_lead->>'id')::uuid,
        v_account_id,
        coalesce(v_lead->>'client', ''),
        coalesce(v_lead->>'phone', ''),
        coalesce(v_lead->>'email', ''),
        coalesce(v_lead->>'address', ''),
        coalesce(v_lead->>'stage', 'new'),
        coalesce(v_lead->>'source', ''),
        coalesce(v_lead->>'notes', ''),
        (v_lead->>'followUpDate')::date,
        nullif(v_lead->>'convertedJobId', '')::uuid,
        coalesce((v_lead->>'created')::timestamptz, now())
      )
      on conflict (id) do nothing;
    end loop;

    -- ── 13. Support Tickets ─────────────────────────────────────────
    for v_ticket in select * from jsonb_array_elements(coalesce(r.db->'supportTickets', '[]'::jsonb))
    loop
      insert into support_tickets (
        id, account_id, subject, body, status, created_at
      )
      values (
        (v_ticket->>'id')::uuid,
        v_account_id,
        coalesce(v_ticket->>'subject', ''),
        coalesce(v_ticket->>'body', ''),
        coalesce(v_ticket->>'status', 'open'),
        coalesce((v_ticket->>'createdAt')::timestamptz, now())
      )
      on conflict (id) do nothing;
    end loop;

    -- ── 14. Custom Documents ────────────────────────────────────────
    for v_doc in select * from jsonb_array_elements(coalesce(r.db->'customDocuments', '[]'::jsonb))
    loop
      insert into custom_documents (
        id, account_id, job_id, name, file_name, file_size,
        notes, doc_type, file_data, uploaded_at
      )
      values (
        (v_doc->>'id')::uuid,
        v_account_id,
        nullif(v_doc->>'jobId', '')::uuid,
        coalesce(v_doc->>'name', ''),
        coalesce(v_doc->>'fileName', ''),
        coalesce((v_doc->>'fileSize')::int, 0),
        coalesce(v_doc->>'notes', ''),
        coalesce(v_doc->>'type', 'other'),
        coalesce(v_doc->>'fileData', ''),
        coalesce((v_doc->>'uploadedAt')::timestamptz, now())
      )
      on conflict (id) do nothing;
    end loop;

    -- ── 15. Custom Templates ────────────────────────────────────────
    -- customTemplates is a keyed object, not an array — iterate keys
    if r.db ? 'customTemplates' then
      for v_tmpl_key, v_tmpl_val in
        select key, value from jsonb_each(r.db->'customTemplates')
      loop
        insert into custom_templates (
          id, account_id, type, name, template_text, file_name, active, created_at
        )
        values (
          coalesce(nullif(v_tmpl_val->>'id', '')::uuid, gen_random_uuid()),
          v_account_id,
          v_tmpl_key,
          coalesce(v_tmpl_val->>'name', ''),
          coalesce(v_tmpl_val->>'text', ''),
          coalesce(v_tmpl_val->>'fileName', ''),
          coalesce((v_tmpl_val->>'active')::boolean, false),
          coalesce((v_tmpl_val->>'createdAt')::timestamptz, now())
        )
        on conflict (account_id, type) do update set
          name          = excluded.name,
          template_text = excluded.template_text,
          file_name     = excluded.file_name,
          active        = excluded.active,
          updated_at    = now();
      end loop;
    end if;

    -- ── 16. Initial Snapshot ────────────────────────────────────────
    -- Capture the full blob as the first snapshot for this account
    insert into snapshots (account_id, snapshot)
    values (v_account_id, r.db);

  end loop; -- end user loop

end;
$$;


-- =============================================================================
-- VALIDATION QUERIES — run these after migration to verify counts match
-- =============================================================================

-- Compare row counts between old blob and new tables:
select
  'jobs'          as entity,
  (select count(*) from jobs)         as new_table,
  (select sum(jsonb_array_length(db->'jobs'))    from user_data) as from_blob
union all select
  'estimates',
  (select count(*) from estimates),
  (select sum(jsonb_array_length(db->'estimates')) from user_data)
union all select
  'contracts',
  (select count(*) from contracts),
  (select sum(jsonb_array_length(db->'contracts')) from user_data)
union all select
  'invoices',
  (select count(*) from invoices),
  (select sum(jsonb_array_length(db->'invoices'))  from user_data)
union all select
  'expenses',
  (select count(*) from expenses),
  (select sum(jsonb_array_length(db->'expenses'))  from user_data)
union all select
  'crew',
  (select count(*) from crew),
  (select sum(jsonb_array_length(db->'crew'))      from user_data)
union all select
  'leads',
  (select count(*) from leads),
  (select sum(jsonb_array_length(db->'leads'))     from user_data);

-- =============================================================================
-- END MIGRATION
-- =============================================================================
