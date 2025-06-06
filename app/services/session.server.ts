// app/services/session.server.ts
import { createCookieSessionStorage } from "react-router";

// Session secret should be stored in .env file
const sessionSecret = process.env.SESSION_SECRET || "super-secret-key";

if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

// Create session storage
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
    sameSite: "lax",
    secrets: [sessionSecret],
    secure: process.env.NODE_ENV === "production",
  },
});

// Get the session from the request
export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

// Create a session with data
export async function createUserSession({
  request,
  userId,
  remember,
  redirectTo,
}: {
  request: Request;
  userId: string;
  remember: boolean;
  redirectTo: string;
}) {
  const session = await getSession(request);
  session.set("user", userId);

  return new Response(null, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session, {
        maxAge: remember
          ? 60 * 60 * 24 * 30 // 30 days
          : undefined,
      }),
      Location: redirectTo,
    },
    status: 302,
  });
}

// Destroy the session (logout)
export async function destroyUserSession(
  request: Request,
  redirectTo: string = "/"
) {
  const session = await getSession(request);

  return new Response(null, {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
      Location: redirectTo,
    },
    status: 302,
  });
}
