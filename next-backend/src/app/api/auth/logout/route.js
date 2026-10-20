import { cookieOptions } from "@/lib/auth";
import { successResponse, withApi } from "@/lib/utils";

export const POST = withApi(async () => {
  const response = successResponse({ message: "Signed out." });
  response.cookies.set("token", "", { ...cookieOptions(), maxAge: 0 });
  return response;
});
