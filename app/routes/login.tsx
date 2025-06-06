// app/routes/login.tsx
import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { authenticator, getAuthenticatedUser } from "~/services/auth.server";
import { sessionStorage } from "~/services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // If the user is already authenticated, redirect to the dashboard
  const user = await getAuthenticatedUser(request);

  if (user) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/dashboard" },
    });
  }

  return Response.json({});
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Authenticate the user
    const user = await authenticator.authenticate("user-pass", request);

    // Create a session
    const session = await sessionStorage.getSession(
      request.headers.get("Cookie")
    );
    session.set("user", user);

    // Redirect to dashboard with the session
    return new Response(null, {
      status: 302,
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session),
        Location: "/dashboard",
      },
    });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Login form content remains the same */}
      <Form method="post" className="space-y-6">
        {/* Form fields remain the same */}
      </Form>
    </div>
  );
}
