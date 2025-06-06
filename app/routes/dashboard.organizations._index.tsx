import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { requireAuth } from "~/services/auth.server";
import { db } from "~/services/db.server";
import { PlusIcon } from "@heroicons/react/24/outline";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);

  // Get organizations owned by the user
  const ownedOrganizations = await db.organization.findMany({
    where: { ownerId: user.id },
    include: {
      _count: {
        select: { teams: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get teams where user is a maintainer, to list their organizations
  const teamMaintainerRoles = await db.teamMaintainer.findMany({
    where: { userId: user.id },
    include: {
      team: {
        include: {
          organization: {
            include: {
              _count: {
                select: { teams: true },
              },
            },
          },
        },
      },
    },
  });

  // Extract organizations from maintained teams, avoiding duplicates
  const maintainedOrgIds = new Set();
  const maintainedOrganizations = [];

  for (const role of teamMaintainerRoles) {
    const organization = role.team.organization;
    if (
      !maintainedOrgIds.has(organization.id) &&
      organization.ownerId !== user.id
    ) {
      maintainedOrgIds.add(organization.id);
      maintainedOrganizations.push(organization);
    }
  }

  return json({ user, ownedOrganizations, maintainedOrganizations });
}

export default function OrganizationsIndex() {
  const { user, ownedOrganizations, maintainedOrganizations } =
    useLoaderData<typeof loader>();

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">
            Organizations
          </h1>
          <Link
            to="/dashboard/organizations/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            New Organization
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          {/* Your Organizations */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Your Organizations
            </h2>

            {ownedOrganizations.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-6 text-center">
                <p className="text-gray-600 mb-4">
                  You don't own any organizations yet.
                </p>
                <Link
                  to="/dashboard/organizations/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Create an Organization
                </Link>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {ownedOrganizations.map((org) => (
                    <li key={org.id}>
                      <Link
                        to={`/dashboard/organizations/${org.id}`}
                        className="block hover:bg-gray-50"
                      >
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                                {org.logoUrl ? (
                                  <img
                                    src={org.logoUrl}
                                    alt={org.name}
                                    className="h-10 w-10 rounded-full"
                                  />
                                ) : (
                                  <span className="text-sm font-medium text-gray-500">
                                    {org.abbreviation ||
                                      org.name.substring(0, 2)}
                                  </span>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-primary-600">
                                  {org.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {org.city}
                                </div>
                              </div>
                            </div>
                            <div className="flex">
                              <div className="ml-2 flex-shrink-0 flex">
                                <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {org.sport.replace("_", " ")}
                                </p>
                              </div>
                              <div className="ml-2 flex-shrink-0 flex">
                                <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  {org._count.teams} Teams
                                </p>
                              </div>
                              <div className="ml-2 flex-shrink-0 flex">
                                <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Owner
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Organizations you maintain */}
          {maintainedOrganizations.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Organizations You Maintain
              </h2>

              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {maintainedOrganizations.map((org) => (
                    <li key={org.id}>
                      <Link
                        to={`/dashboard/organizations/${org.id}`}
                        className="block hover:bg-gray-50"
                      >
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                                {org.logoUrl ? (
                                  <img
                                    src={org.logoUrl}
                                    alt={org.name}
                                    className="h-10 w-10 rounded-full"
                                  />
                                ) : (
                                  <span className="text-sm font-medium text-gray-500">
                                    {org.abbreviation ||
                                      org.name.substring(0, 2)}
                                  </span>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-primary-600">
                                  {org.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {org.city}
                                </div>
                              </div>
                            </div>
                            <div className="flex">
                              <div className="ml-2 flex-shrink-0 flex">
                                <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {org.sport.replace("_", " ")}
                                </p>
                              </div>
                              <div className="ml-2 flex-shrink-0 flex">
                                <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  {org._count.teams} Teams
                                </p>
                              </div>
                              <div className="ml-2 flex-shrink-0 flex">
                                <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Maintainer
                                </p>
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
        </div>
      </div>
    </div>
  );
}
