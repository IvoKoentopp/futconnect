-- Enable RLS
alter table transactions enable row level security;

-- Create policies
create policy "Transactions are viewable by club members"
on transactions for select
to authenticated
using (
  exists (
    select 1 from members
    where members.club_id = transactions.club_id
    and members.email = auth.jwt() ->> 'email'
  )
);

create policy "Transactions are insertable by club admins"
on transactions for insert
to authenticated
with check (
  exists (
    select 1 from club_admins
    where club_admins.club_id = transactions.club_id
    and club_admins.email = auth.jwt() ->> 'email'
  )
);

create policy "Transactions are updatable by club admins"
on transactions for update
to authenticated
using (
  exists (
    select 1 from club_admins
    where club_admins.club_id = transactions.club_id
    and club_admins.email = auth.jwt() ->> 'email'
  )
)
with check (
  exists (
    select 1 from club_admins
    where club_admins.club_id = transactions.club_id
    and club_admins.email = auth.jwt() ->> 'email'
  )
);

create policy "Transactions are deletable by club admins"
on transactions for delete
to authenticated
using (
  exists (
    select 1 from club_admins
    where club_admins.club_id = transactions.club_id
    and club_admins.email = auth.jwt() ->> 'email'
  )
);
