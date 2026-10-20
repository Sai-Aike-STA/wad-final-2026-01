import { publicUser, requireUser } from "@/lib/auth";
import { HttpError, successResponse, withApi } from "@/lib/utils";

export const GET = withApi(async (request, context) => {
  const user = await requireUser(request);
  const { user_id } = await context.params;
  if (user._id.toString() !== user_id) throw new HttpError(403, "Only your own profile is available.");
  return successResponse({ user: publicUser(user) });
});
