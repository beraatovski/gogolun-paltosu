-- ============================================================================
-- GOGOL'UN PALTOSU (gogolunpaltosu.com)
-- SUPABASE TAM VERİTABANI VE BACKEND ŞEMASI (PRODUCTION SCHEMA - HATASIZ SÜRÜM)
-- ============================================================================
-- Bu dosyayı Supabase Dashboard'unuzdaki (https://supabase.com/dashboard)
-- SQL Editor sekmesine yapıştırıp "RUN" düğmesine basarak tüm veritabanı
-- tablolarını, tetikleyicileri (trigger), fonksiyonları ve güvenlik kurallarını (RLS)
-- tek seferde ve hatasız kurabilirsiniz.
-- ============================================================================

-- 1. PROFILES TABLOSU (Kullanıcı Profilleri)
-- auth.users ile birebir eşleşir, kullanıcı adı, okuma listesi, rozetleri saklar.
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  username text,
  full_name text default 'Edebiyat Okuru',
  avatar_url text default '',
  role text default 'member', -- 'admin' veya 'member'
  reading_list jsonb default '[]'::jsonb,
  badges jsonb default '[]'::jsonb,
  challenges jsonb default '[]'::jsonb,
  quotes jsonb default '[]'::jsonb,
  camp_joined boolean default false,
  camp_status text default '',
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Eski kısıtlamaları kaldır (çakışmaları engellemek için)
alter table public.profiles drop constraint if exists profiles_username_key;
drop index if exists idx_profiles_username;

-- Varsa profiles içindeki mükerrer kullanıcı adlarını otomatik benzersiz yap
with dupes as (
  select id, username,
         row_number() over (partition by lower(username) order by created_at asc) as rn
  from public.profiles
  where username is not null and username <> ''
)
update public.profiles p
set username = p.username || '_' || substring(replace(p.id::text, '-', ''), 1, 4)
from dupes d
where p.id = d.id and d.rn > 1;

-- Profiles İndeksleri
create unique index if not exists idx_profiles_username on public.profiles (lower(username));
create index if not exists idx_profiles_email on public.profiles (lower(email));
create index if not exists idx_profiles_role on public.profiles (role);

-- Profiles RLS (Satır Bazlı Güvenlik)
alter table public.profiles enable row level security;

drop policy if exists "Profiller herkes tarafından görüntülenebilir" on public.profiles;
create policy "Profiller herkes tarafından görüntülenebilir"
  on public.profiles for select using (true);

drop policy if exists "Kullanıcılar kendi profilini güncelleyebilir" on public.profiles;
create policy "Kullanıcılar kendi profilini güncelleyebilir"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "Kullanıcılar kendi profilini oluşturabilir" on public.profiles;
create policy "Kullanıcılar kendi profilini oluşturabilir"
  on public.profiles for insert with check (auth.uid() = id);


-- 2. KİTAP İNCELEMELERİ VE PUANLAR (Book Reviews)
-- Okurların kitaplara yazdıkları incelemeleri ve 1-5 arası yıldız puanlarını saklar.
create table if not exists public.book_reviews (
  id text primary key,
  book_id text not null,
  user_id uuid references auth.users on delete set null,
  user_name text not null,
  username text,
  email text,
  avatar_url text default '',
  rating integer default 5 check (rating >= 1 and rating <= 5),
  comment text not null,
  likes_count integer default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Book Reviews İndeksleri
create index if not exists idx_book_reviews_book_id on public.book_reviews (book_id);
create index if not exists idx_book_reviews_created on public.book_reviews (created_at desc);

-- Book Reviews RLS
alter table public.book_reviews enable row level security;

drop policy if exists "Kitap incelemeleri herkese açıktır" on public.book_reviews;
create policy "Kitap incelemeleri herkese açıktır"
  on public.book_reviews for select using (true);

drop policy if exists "Giriş yapanlar veya ziyaretçiler inceleme yazabilir" on public.book_reviews;
create policy "Giriş yapanlar veya ziyaretçiler inceleme yazabilir"
  on public.book_reviews for insert with check (true);

drop policy if exists "Kullanıcı kendi incelemesini güncelleyebilir" on public.book_reviews;
create policy "Kullanıcı kendi incelemesini güncelleyebilir"
  on public.book_reviews for update using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Kullanıcı veya yönetici incelemeyi silebilir" on public.book_reviews;
create policy "Kullanıcı veya yönetici incelemeyi silebilir"
  on public.book_reviews for delete using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- 3. OKUMA KAMPI TARTIŞMA YORUMLARI (Camp Comments)
-- Okuma kampı forumundaki canlı okur tartışmalarını ve fikir paylaşımlarını saklar.
create table if not exists public.camp_comments (
  id text primary key,
  camp_id text default 'camp_2026_ekim',
  user_id uuid references auth.users on delete set null,
  user_name text not null,
  username text,
  avatar_url text default '',
  role text default 'member',
  text text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Camp Comments İndeksleri
create index if not exists idx_camp_comments_camp on public.camp_comments (camp_id);
create index if not exists idx_camp_comments_created on public.camp_comments (created_at asc);

-- Camp Comments RLS
alter table public.camp_comments enable row level security;

drop policy if exists "Kamp yorumları herkese açıktır" on public.camp_comments;
create policy "Kamp yorumları herkese açıktır"
  on public.camp_comments for select using (true);

drop policy if exists "Herkes kamp yorumu yazabilir" on public.camp_comments;
create policy "Herkes kamp yorumu yazabilir"
  on public.camp_comments for insert with check (true);

drop policy if exists "Kendi yorumunu veya yönetici silebilir" on public.camp_comments;
create policy "Kendi yorumunu veya yönetici silebilir"
  on public.camp_comments for delete using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- 4. OKUMA KAMPI KATILIMCILARI (Camp Participants)
-- Kampa katılan okurların listesini saklar.
create table if not exists public.camp_participants (
  id text primary key,
  camp_id text default 'camp_2026_ekim',
  user_id uuid references auth.users on delete cascade,
  username text not null,
  full_name text not null,
  avatar_url text default '',
  role text default 'member',
  status text default '🎯 Tartışmaya Katıldı · Okuyor',
  notes text default 'Okuma kampında yerini aldı.',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Camp Participants İndeksleri
create unique index if not exists idx_camp_part_unique on public.camp_participants (camp_id, lower(username));

-- Camp Participants RLS
alter table public.camp_participants enable row level security;

drop policy if exists "Kamp katılımcıları herkese açıktır" on public.camp_participants;
create policy "Kamp katılımcıları herkese açıktır"
  on public.camp_participants for select using (true);

drop policy if exists "Kampa herkes katılabilir" on public.camp_participants;
create policy "Kampa herkes katılabilir"
  on public.camp_participants for insert with check (true);

drop policy if exists "Kendi kamp kaydını güncelleyebilir" on public.camp_participants;
create policy "Kendi kamp kaydını güncelleyebilir"
  on public.camp_participants for update using (auth.uid() = user_id);

drop policy if exists "Kendi kamp kaydını silebilir veya ayrılabilir" on public.camp_participants;
create policy "Kendi kamp kaydını silebilir veya ayrılabilir"
  on public.camp_participants for delete using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- 5. TOPLULUK EDEBİ ALINTILARI (Community Quotes)
-- Alıntılar duvarına okurların eklediği edebi pasajları saklar.
create table if not exists public.community_quotes (
  id text primary key,
  text text not null,
  author text not null,
  book text default '',
  page text default '',
  user_id uuid references auth.users on delete set null,
  user_name text not null,
  username text,
  avatar_url text default '',
  likes_count integer default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Community Quotes İndeksleri
create index if not exists idx_community_quotes_created on public.community_quotes (created_at desc);

-- Community Quotes RLS
alter table public.community_quotes enable row level security;

drop policy if exists "Alıntılar herkese açıktır" on public.community_quotes;
create policy "Alıntılar herkese açıktır"
  on public.community_quotes for select using (true);

drop policy if exists "Alıntı paylaşımı açıktır" on public.community_quotes;
create policy "Alıntı paylaşımı açıktır"
  on public.community_quotes for insert with check (true);

drop policy if exists "Kendi alıntısını güncelleyebilir" on public.community_quotes;
create policy "Kendi alıntısını güncelleyebilir"
  on public.community_quotes for update using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Kendi alıntısını veya yönetici silebilir" on public.community_quotes;
create policy "Kendi alıntısını veya yönetici silebilir"
  on public.community_quotes for delete using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- 6. RPC FONKSİYONU: KULLANICI ADIYLA E-POSTA BULMA (get_email_by_username)
-- Üyelerin hem e-posta hem de @kullaniciadi ile giriş yapabilmesini sağlar.
create or replace function public.get_email_by_username(p_username text)
returns text security definer as $$
declare
  found_email text;
  clean_uname text;
begin
  clean_uname := lower(trim(replace(p_username, '@', '')));
  
  -- Önce public.profiles tablosuna bak
  select email into found_email from public.profiles
  where lower(username) = clean_uname limit 1;

  if found_email is not null then
    return found_email;
  end if;

  -- Yoksa auth.users tablosunun metadata alanına bak
  select email into found_email from auth.users
  where lower(raw_user_meta_data->>'username') = clean_uname limit 1;

  return found_email;
end;
$$ language plpgsql;


-- 7. RPC FONKSİYONU: TÜM ÜYELERİ ÇEKME (get_all_members)
-- Yönetim panelinde tüm üyeleri, rolleri ve kayıt tarihlerini listeler.
create or replace function public.get_all_members()
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  raw_user_meta_data jsonb
) security definer as $$
begin
  return query select u.id, u.email, u.created_at, u.raw_user_meta_data
  from auth.users u order by u.created_at desc;
end;
$$ language plpgsql;


-- 8. TETİKLEYİCİ (TRIGGER): YENİ KAYITTA OTOMATİK PROFİL OLUŞTURMA
-- auth.users tablosuna yeni bir kullanıcı kaydolduğunda public.profiles tablosuna kopyalar.
create or replace function public.handle_new_user()
returns trigger security definer as $$
declare
  candidate_username text;
  final_username text;
  default_role text;
  suffix int := 1;
begin
  candidate_username := lower(coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1), 'okur'));
  final_username := candidate_username;
  
  -- Eğer username başka bir kullanıcı tarafından alınmışsa, çakışmayı önlemek için otomatik benzersiz yap
  while exists (select 1 from public.profiles where lower(username) = final_username and id <> new.id) loop
    suffix := suffix + 1;
    final_username := candidate_username || '_' || suffix;
  end loop;

  if new.email ilike '%gogolunpaltosu%' or final_username = 'gogolunpaltosu' then
    default_role := 'admin';
  else
    default_role := coalesce(new.raw_user_meta_data->>'role', 'member');
  end if;

  insert into public.profiles (
    id, email, username, full_name, avatar_url, role, reading_list, badges, challenges, quotes
  ) values (
    new.id,
    new.email,
    final_username,
    coalesce(new.raw_user_meta_data->>'full_name', 'Edebiyat Okuru'),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    default_role,
    coalesce(new.raw_user_meta_data->'reading_list', '[]'::jsonb),
    coalesce(new.raw_user_meta_data->'badges', '[]'::jsonb),
    coalesce(new.raw_user_meta_data->'challenges', '[]'::jsonb),
    coalesce(new.raw_user_meta_data->'quotes', '[]'::jsonb)
  )
  on conflict (id) do update set
    email = excluded.email,
    username = excluded.username,
    full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
    avatar_url = coalesce(nullif(excluded.avatar_url, ''), profiles.avatar_url),
    role = case when excluded.role = 'admin' then 'admin' else profiles.role end,
    updated_at = now();
    
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.handle_new_user();


-- 9. MEVCUT AUTH.USERS KAYITLARINI ÇAKIŞMASIZ AKTAR
-- auth.users içinde birden fazla hesap aynı kullanıcı adına sahip olsa bile asla hata vermez
with numbered_auth as (
  select 
    u.id, 
    u.email, 
    lower(coalesce(nullif(trim(u.raw_user_meta_data->>'username'), ''), split_part(u.email, '@', 1), 'okur')) as base_uname,
    coalesce(u.raw_user_meta_data->>'full_name', 'Edebiyat Okuru') as full_name,
    coalesce(u.raw_user_meta_data->>'avatar_url', '') as avatar_url,
    case when u.email ilike '%gogolunpaltosu%' or lower(coalesce(u.raw_user_meta_data->>'username','')) = 'gogolunpaltosu' then 'admin' else 'member' end as role,
    coalesce(u.raw_user_meta_data->'reading_list', '[]'::jsonb) as reading_list,
    row_number() over (
      partition by lower(coalesce(nullif(trim(u.raw_user_meta_data->>'username'), ''), split_part(u.email, '@', 1), 'okur')) 
      order by u.created_at asc
    ) as rn
  from auth.users u
)
insert into public.profiles (id, email, username, full_name, avatar_url, role, reading_list)
select 
  na.id, 
  na.email, 
  case 
    when na.rn = 1 then na.base_uname 
    else na.base_uname || '_' || substring(replace(na.id::text, '-', ''), 1, 4) 
  end as username,
  na.full_name,
  na.avatar_url,
  na.role,
  na.reading_list
from numbered_auth na
on conflict (id) do update set
  email = excluded.email,
  username = excluded.username,
  full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
  avatar_url = coalesce(nullif(excluded.avatar_url, ''), profiles.avatar_url),
  role = case when excluded.role = 'admin' then 'admin' else profiles.role end,
  updated_at = now();
