import { publicUser, requireUser } from "@/lib/auth";
import { successResponse, withApi } from "@/lib/utils";

export const GET = withApi(async (request) => {
  const user = await requireUser(request);
  return successResponse({ user: publicUser(user) });
});
