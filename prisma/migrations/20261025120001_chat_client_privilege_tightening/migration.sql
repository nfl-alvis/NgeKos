-- Spec #10 (real-time website chat) — penguatan hasil audit keamanan:
-- role klien (anon, authenticated) mewarisi {MAINTAIN, REFERENCES, TRIGGER,
-- TRUNCATE} pada tabel chat dari directive default-privilege Supabase
-- (grant langsung oleh role postgres). Tidak ada yang dibutuhkan akses
-- baca-saja klien: SELECT tetap diberikan (migration sebelumnya), DML tetap
-- tidak diberikan, dan jalur tulis API lewat role pemilik (postgres) tidak
-- tersentuh. Forward-only dan idempoten (REVOKE tanpa grant = no-op).

-- 1. Cabut privilege standar yang kompatibel di seluruh versi PostgreSQL:
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.conversations FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.conversations FROM authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.messages FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.messages FROM authenticated;

-- 2. Cabut privilege MAINTAIN secara dinamis jika server PostgreSQL >= 17:
DO $$
BEGIN
    IF current_setting('server_version_num')::int >= 170000 THEN
        EXECUTE 'REVOKE MAINTAIN ON public.conversations FROM anon';
        EXECUTE 'REVOKE MAINTAIN ON public.conversations FROM authenticated';
        EXECUTE 'REVOKE MAINTAIN ON public.messages FROM anon';
        EXECUTE 'REVOKE MAINTAIN ON public.messages FROM authenticated';
    END IF;
END $$;
