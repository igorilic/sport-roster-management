import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { requireAuth } from "~/services/auth.server";
import { db } from "~/services/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);

  // Get organizations owned by the user
  const organizations = await db.organization.findMany({
    where: { ownerId: user.id },
    include: {
      teams: {
        select: {
          id: true,
          name: true,
          _count: {
            select: { players: true },
          },
        },
      },
      _count: {
        select: { teams: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get teams where user is a maintainer
  const teamMaintainerRoles = await db.teamMaintainer.findMany({
    where: { userId: user.id },
    include: {
      team: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              sport: true,
            },
          },
          _count: {
            select: { players: true },
          },
        },
      },
    },
  });

  const maintainedTeams = teamMaintainerRoles.map((role) => role.team);

  return json({ user, organizations, maintainedTeams });
}

export default function DashboardIndex() {
  const { user, organizations, maintainedTeams } =
    useLoaderData<typeof loader>();

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          {/* Welcome section */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              Welcome, {user.firstName || user.email}!
            </h2>
            <p className="text-gray-600">
              This is your roster management dashboard. Manage your
              organizations, teams, and players all in one place.
            </p>

            {organizations.length === 0 && maintainedTeams.length === 0 && (
              <div className="mt-4">
                <Link
                  to="/dashboard/organizations/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Create Your First Organization
                </Link>
              </div>
            )}
          </div>

          {/* Organizations section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Your Organizations
              </h2>
              <Link
                to="/dashboard/organizations/new"
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Add Organization
              </Link>
            </div>

            {organizations.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-6 text-center">
                <p className="text-gray-600">
                  You don't have any organizations yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {organizations.map((org) => (
                  <Link
                    key={org.id}
                    to={`/dashboard/organizations/${org.id}`}
                    className="bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow duration-150"
                  >
                    <div className="flex items-center mb-2">
                      <div className="bg-gray-200 rounded-full h-8 w-8 flex items-center justify-center mr-2">
                        {org.logoUrl ? (
                          <img
                            src={org.logoUrl}
                            alt={org.name}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-600">
                            {org.abbreviation || org.name.substring(0, 2)}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {org.name}
                      </h3>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{org.city}</span>
                      <span>{org.sport}</span>
                    </div>
                    <div className="mt-3 text-sm text-gray-600">
                      {org._count.teams} Teams ·{" "}
                      {org.teams.reduce(
                        (acc, team) => acc + team._count.players,
                        0
                      )}{" "}
                      Players
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Teams section - for teams the user maintains but doesn't own */}
          {maintainedTeams.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Teams You Maintain
              </h2>
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {maintainedTeams.map((team) => (
                    <li key={team.id}>
                      <Link
                        to={`/dashboard/organizations/${team.organization.id}/teams/${team.id}`}
                        className="block hover:bg-gray-50"
                      >
                        <div className="px-4 py-4 flex items-center sm:px-6">
                          <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                              <div className="flex text-sm">
                                <p className="font-medium text-primary-600 truncate">
                                  {team.name}
                                </p>
                                <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                                  in {team.organization.name}
                                </p>
                              </div>
                              <div className="mt-2 flex">
                                <div className="flex items-center text-sm text-gray-500">
                                  <p>
                                    {team._count.players} Players ·{" "}
                                    {team.organization.sport}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Quick action cards */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-base font-medium text-gray-900 mb-2">
                  Add a Team
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Create a new team for one of your organizations.
                </p>
                <Link
                  to="/dashboard/organizations"
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  View Organizations →
                </Link>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-base font-medium text-gray-900 mb-2">
                  Manage Players
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Add or edit players in your teams.
                </p>
                <Link
                  to="/dashboard/organizations"
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  View Teams →
                </Link>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-base font-medium text-gray-900 mb-2">
                  Export Rosters
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Export your team rosters to Excel or PDF.
                </p>
                <Link
                  to="/dashboard/organizations"
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  Select a Team →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
