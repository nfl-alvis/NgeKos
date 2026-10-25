-- Spec #10 (real-time website chat) — penguatan hasil audit keamanan:
-- role klien (anon, authenticated) mewarisi {MAINTAIN, REFERENCES, TRIGGER,
-- TRUNCATE} pada tabel chat dari directive default-privilege Supabase
-- (grant langsung oleh role postgres). Tidak ada yang dibutuhkan akses
-- baca-saja klien: SELECT tetap diberikan (migration sebelumnya), DML tetap
-- tidak diberikan, dan jalur tulis API lewat role pemilik (postgres) tidak
-- tersentuh. Forward-only dan idempoten (REVOKE tanpa grant = no-op).

REVOKE MAINTAIN, TRUNCATE, REFERENCES, TRIGGER ON public.conversations FROM anon;
REVOKE MAINTAIN, TRUNCATE, REFERENCES, TRIGGER ON public.conversations FROM authenticated;
REVOKE MAINTAIN, TRUNCATE, REFERENCES, TRIGGER ON public.messages FROM anon;
REVOKE MAINTAIN, TRUNCATE, REFERENCES, TRIGGER ON public.messages FROM authenticated;
