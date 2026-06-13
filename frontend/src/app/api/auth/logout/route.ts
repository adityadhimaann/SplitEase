import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // Use the exact URL the request came from to build the redirect
  const url = new URL(req.url);
  const response = NextResponse.redirect(new URL("/login", url.origin));
  
  response.cookies.delete("auth_token");
  
  return response;
}
