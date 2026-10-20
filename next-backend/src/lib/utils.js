import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import corsHeaders from "./cors";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function errorResponse(message, status) {
  return NextResponse.json({ message }, { status });
}

export function successResponse(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function withApi(handler) {
  return async (request, context) => {
    let response;
    try {
      response = await handler(request, context);
    } catch (error) {
      if (error instanceof HttpError) response = errorResponse(error.message, error.status);
      else if (error instanceof SyntaxError) response = errorResponse("Invalid JSON body.", 400);
      else {
        console.error("API request failed. Check server configuration and database access.");
        response = errorResponse("The server could not complete the request. Please try again.", 500);
      }
    }
    for (const [key, value] of Object.entries(corsHeaders(request))) response.headers.set(key, value);
    return response;
  };
}

export async function readJson(request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new HttpError(415, "Use application/json for the request body.");
  }
  const data = await request.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new HttpError(400, "A JSON object is required.");
  }
  return data;
}

export function objectId(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{24}$/i.test(value)) {
    throw new HttpError(400, "Invalid identifier.");
  }
  return new ObjectId(value);
}
