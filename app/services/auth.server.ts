// app/services/auth.server.ts
import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { createCookieSessionStorage } from "react-router";
import { db } from "~/services/db.server";
import bcrypt from "bcryptjs";

// Define your user type
export type User = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
};

// Create a session storage
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET || "super-secret-key"],
    secure: process.env.NODE_ENV === "production",
  },
});

// Create an instance of the authenticator
export const authenticator = new Authenticator<User>();

// Configure FormStrategy
authenticator.use(
  new FormStrategy(async ({ form }) => {
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    // Find the user by email
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Compare passwords
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

    // Return the user data (excluding the password)
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      isEmailVerified: user.isEmailVerified,
    };
  }),
  "user-pass"
);

// Helper function to get the authenticated user
export async function getAuthenticatedUser(
  request: Request
): Promise<User | null> {
  try {
    return await authenticator.authenticate("user-pass", request);
  } catch (error) {
    return null;
  }
}

// Helper function to require authentication
export async function requireAuth(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }

  return user;
}

// Helper function to require email verification
export async function requireVerifiedEmail(request: Request) {
  const user = await requireAuth(request);

  if (!user.isEmailVerified) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/verify-email" },
    });
  }

  return user;
}
