import { PrismaClient, UserRole, UserStatus, AdminRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding dummy owner and admin accounts...");

  const OWNER_ID = "58983471-0904-40df-beb8-3a51888b176b";
  const OWNER_EMAIL = "owner@ngekost.id";
  const OWNER_PASS = "Password123!";
  const OWNER_NAME = "Ratri Wulandari (Owner Demo)";

  const ADMIN_ID = "a1111111-1111-1111-1111-111111111111";
  const ADMIN_EMAIL = "admin@ngekost.id";
  const ADMIN_PASS = "Password123!";
  const ADMIN_NAME = "Bayu Pratama (Admin Demo)";

  // 1. Owner in auth.users
  await prisma.$executeRawUnsafe(`
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, recovery_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      '${OWNER_ID}'::uuid,
      'authenticated',
      'authenticated',
      '${OWNER_EMAIL}',
      crypt('${OWNER_PASS}', gen_salt('bf', 10)),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"${OWNER_NAME}","role":"owner"}'::jsonb,
      NOW(), NOW(), '', '', '', ''
    )
    ON CONFLICT (id) DO UPDATE SET
      email = '${OWNER_EMAIL}',
      encrypted_password = crypt('${OWNER_PASS}', gen_salt('bf', 10)),
      email_confirmed_at = NOW(),
      raw_user_meta_data = '{"full_name":"${OWNER_NAME}","role":"owner"}'::jsonb,
      updated_at = NOW();
  `);

  // Owner in auth.identities
  await prisma.$executeRawUnsafe(`
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      '${OWNER_ID}'::uuid,
      '{"sub":"${OWNER_ID}","email":"${OWNER_EMAIL}","full_name":"${OWNER_NAME}","role":"owner"}'::jsonb,
      'email',
      '${OWNER_ID}',
      NOW(), NOW(), NOW()
    )
    ON CONFLICT (provider, provider_id) DO UPDATE SET
      identity_data = '{"sub":"${OWNER_ID}","email":"${OWNER_EMAIL}","full_name":"${OWNER_NAME}","role":"owner"}'::jsonb,
      updated_at = NOW();
  `);

  // Owner in public.profiles
  await prisma.profile.upsert({
    where: { id: OWNER_ID },
    update: {
      email: OWNER_EMAIL,
      fullName: OWNER_NAME,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
    },
    create: {
      id: OWNER_ID,
      email: OWNER_EMAIL,
      fullName: OWNER_NAME,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      locale: "id",
    },
  });
  console.log("✓ Owner account ready:", OWNER_EMAIL, "/", OWNER_PASS);

  // 2. Admin in auth.users
  await prisma.$executeRawUnsafe(`
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, recovery_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      '${ADMIN_ID}'::uuid,
      'authenticated',
      'authenticated',
      '${ADMIN_EMAIL}',
      crypt('${ADMIN_PASS}', gen_salt('bf', 10)),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"${ADMIN_NAME}","role":"admin"}'::jsonb,
      NOW(), NOW(), '', '', '', ''
    )
    ON CONFLICT (id) DO UPDATE SET
      email = '${ADMIN_EMAIL}',
      encrypted_password = crypt('${ADMIN_PASS}', gen_salt('bf', 10)),
      email_confirmed_at = NOW(),
      raw_user_meta_data = '{"full_name":"${ADMIN_NAME}","role":"admin"}'::jsonb,
      updated_at = NOW();
  `);

  // Admin in auth.identities
  await prisma.$executeRawUnsafe(`
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      '${ADMIN_ID}'::uuid,
      '{"sub":"${ADMIN_ID}","email":"${ADMIN_EMAIL}","full_name":"${ADMIN_NAME}","role":"admin"}'::jsonb,
      'email',
      '${ADMIN_ID}',
      NOW(), NOW(), NOW()
    )
    ON CONFLICT (provider, provider_id) DO UPDATE SET
      identity_data = '{"sub":"${ADMIN_ID}","email":"${ADMIN_EMAIL}","full_name":"${ADMIN_NAME}","role":"admin"}'::jsonb,
      updated_at = NOW();
  `);

  // Admin in public.profiles
  await prisma.profile.upsert({
    where: { id: ADMIN_ID },
    update: {
      email: ADMIN_EMAIL,
      fullName: ADMIN_NAME,
      role: UserRole.ADMIN,
      adminRole: AdminRole.SUPER,
      status: UserStatus.ACTIVE,
    },
    create: {
      id: ADMIN_ID,
      email: ADMIN_EMAIL,
      fullName: ADMIN_NAME,
      role: UserRole.ADMIN,
      adminRole: AdminRole.SUPER,
      status: UserStatus.ACTIVE,
      locale: "id",
    },
  });
  console.log("✓ Admin account ready:", ADMIN_EMAIL, "/", ADMIN_PASS);

  console.log("Dummy accounts seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding dummy accounts:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
