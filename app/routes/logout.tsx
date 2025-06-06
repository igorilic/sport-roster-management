import { ActionFunctionArgs } from "@remix-run/node";
import { sessionStorage } from "~/services/session.server";

export async function action({ request }: ActionFunctionArgs) {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  );

  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
      Location: "/login",
    },
  });
}

export async function loader() {
  return new Response("This route is for action only", { status: 400 });
}
