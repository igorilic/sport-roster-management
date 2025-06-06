import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { LoaderFunctionArgs } from "@remix-run/node";
import { getAuthenticatedUser } from "~/services/auth.server";
import styles from "~/styles/app.css";

export function links() {
  return [
    { rel: "stylesheet", href: styles },
    { rel: "stylesheet", href: "https://rsms.me/inter/inter.css" },
    { rel: "icon", href: "/favicon.ico" },
  ];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getAuthenticatedUser(request);
  return Response.json({ user });
}

export default function App() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <html lang="en" className="h-full bg-gray-50">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full">
        {user && (
          <div className="bg-primary-600 text-white text-xs text-center py-1">
            Logged in as {user.email}
          </div>
        )}
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
