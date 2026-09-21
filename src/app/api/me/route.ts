import { prisma } from "@/lib/prisma";
import { parseJson, successResponse, withApi } from "@/server/http";
import { requireUser } from "@/server/auth";
import { profileUpdateSchema } from "@/server/validation";

function profileDto(profile: Awaited<ReturnType<typeof requireUser>>["profile"]) {
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    phone: profile.phone,
    avatarUrl: profile.avatarUrl,
    birthPlace: profile.birthPlace,
    occupation: profile.occupation,
    role: profile.role,
    adminRole: profile.adminRole,
    locale: profile.locale,
    preferences: {
      emailNotifications: profile.emailNotifications,
      pushNotifications: profile.pushNotifications,
      marketingNotifications: profile.marketingNotifications,
    },
  };
}

export const GET = withApi(async () => {
  const auth = await requireUser();
  return successResponse(profileDto(auth.profile));
});

export const PATCH = withApi(async (request: Request) => {
  const auth = await requireUser();
  const input = await parseJson(request, profileUpdateSchema);
  const profile = await prisma.profile.update({ where: { id: auth.profile.id }, data: input });
  return successResponse(profileDto(profile));
});

export const DELETE = withApi(async () => {
  const auth = await requireUser();
  await prisma.profile.update({
    where: { id: auth.profile.id },
    data: {
      deletedAt: new Date(),
      status: "DELETED",
    },
  });
  return new Response(null, { status: 204 });
});

