import {
  json,
  LoaderFunctionArgs,
  ActionFunctionArgs,
  redirect,
} from "@remix-run/node";
import {
  Form,
  Link,
  Outlet,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
  useParams,
  useSubmit,
} from "@remix-run/react";
import { db } from "~/services/db.server";
import { requireAuth } from "~/services/auth.server";
import { z } from "zod";
import { useState } from "react";
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  UserPlusIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import invariant from "tiny-invariant";

// Update organization schema
const UpdateOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  city: z.string().min(1, "City is required").max(100),
  abbreviation: z.string().min(1, "Abbreviation is required").max(10),
  _action: z.enum(["update", "delete"]),
});

// Helper to check if user is owner of organization
async function isOrganizationOwner(organizationId: string, userId: string) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { ownerId: true },
  });

  return org?.ownerId === userId;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  const { organizationId } = params;

  invariant(organizationId, "Organization ID is required");

  // Get the organization with teams
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    include: {
      teams: {
        include: {
          _count: {
            select: { players: true },
          },
        },
        orderBy: { name: "asc" },
      },
      owner: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!organization) {
    throw new Response("Organization not found", { status: 404 });
  }

  // Check if user is the owner or a team maintainer
  const isOwner = organization.ownerId === user.id;

  // Get team maintainer roles for this user in this organization
  const teamMaintainerRoles = await db.teamMaintainer.findMany({
    where: {
      userId: user.id,
      team: {
        organizationId: organizationId,
      },
    },
    include: {
      team: true,
    },
  });

  const maintainedTeamIds = teamMaintainerRoles.map((role) => role.teamId);

  // Check if user has any access to this organization
  if (!isOwner && teamMaintainerRoles.length === 0) {
    throw new Response("You don't have permission to view this organization", {
      status: 403,
    });
  }

  return json({
    organization,
    isOwner,
    maintainedTeamIds,
    user,
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  const { organizationId } = params;

  invariant(organizationId, "Organization ID is required");

  // Check if user is the owner of the organization
  const hasPermission = await isOrganizationOwner(organizationId, user.id);

  if (!hasPermission) {
    return json(
      { error: "You don't have permission to modify this organization" },
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const name = formData.get("name") as string;
  const city = formData.get("city") as string;
  const abbreviation = formData.get("abbreviation") as string;
  const _action = formData.get("_action") as string;

  // Validate the form data
  const validationResult = UpdateOrganizationSchema.safeParse({
    name,
    city,
    abbreviation,
    _action,
  });

  if (!validationResult.success) {
    return json({ errors: validationResult.error.format() }, { status: 400 });
  }

  // Handle different actions
  if (_action === "delete") {
    await db.organization.delete({
      where: { id: organizationId },
    });

    return redirect("/dashboard/organizations");
  } else if (_action === "update") {
    const updatedOrganization = await db.organization.update({
      where: { id: organizationId },
      data: {
        name,
        city,
        abbreviation,
      },
    });

    return json({ success: true, organization: updatedOrganization });
  }

  return json({ error: "Invalid action" }, { status: 400 });
}

export default function OrganizationDetails() {
  const { organization, isOwner, maintainedTeamIds } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSubmitting = navigation.state === "submitting";

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = (event: React.FormEvent<HTMLFormElement>) => {
    if (!showDeleteConfirm) {
      event.preventDefault();
      setShowDeleteConfirm(true);
      return;
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link
              to="/dashboard/organizations"
              className="text-sm font-medium text-primary-600 hover:text-primary-500 mr-2"
            >
              Organizations
            </Link>
            <span className="text-gray-500 mx-2">/</span>
            <h1 className="text-2xl font-semibold text-gray-900">
              {organization.name}
            </h1>
          </div>

          {isOwner && (
            <div className="flex space-x-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <PencilIcon className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
                Edit
              </button>

              <Link
                to={`/dashboard/organizations/${organization.id}/teams/new`}
                className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
                Add Team
              </Link>

              <Link
                to={`/dashboard/organizations/${organization.id}/invite`}
                className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <UserPlusIcon
                  className="-ml-1 mr-2 h-4 w-4"
                  aria-hidden="true"
                />
                Invite
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Organization Header */}
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center">
                    {organization.logoUrl ? (
                      <img
                        src={organization.logoUrl}
                        alt={organization.name}
                        className="h-16 w-16 rounded-full"
                      />
                    ) : (
                      <span className="text-xl font-bold text-gray-500">
                        {organization.abbreviation}
                      </span>
                    )}
                  </div>
                  <div className="ml-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      {organization.name}
                    </h2>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <span>{organization.city}</span>
                      <span className="mx-2">•</span>
                      <span>{organization.sport.replace("_", " ")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <ArrowDownTrayIcon
                      className="-ml-1 mr-2 h-4 w-4"
                      aria-hidden="true"
                    />
                    Export
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <PrinterIcon
                      className="-ml-1 mr-2 h-4 w-4"
                      aria-hidden="true"
                    />
                    Print
                  </button>
                </div>
              </div>
            </div>

            {/* Edit Organization Form */}
            {isEditing && isOwner && (
              <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
                <Form method="post" className="space-y-4">
                  {actionData?.error && (
                    <div className="rounded-md bg-red-50 p-4">
                      <div className="flex">
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            {actionData.error}
                          </h3>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Organization Name
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="name"
                          id="name"
                          defaultValue={organization.name}
                          className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      {actionData?.errors?.name && (
                        <p className="mt-2 text-sm text-red-600">
                          {actionData.errors.name._errors[0]}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="city"
                        className="block text-sm font-medium text-gray-700"
                      >
                        City
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="city"
                          id="city"
                          defaultValue={organization.city}
                          className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      {actionData?.errors?.city && (
                        <p className="mt-2 text-sm text-red-600">
                          {actionData.errors.city._errors[0]}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-1">
                      <label
                        htmlFor="abbreviation"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Abbreviation
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="abbreviation"
                          id="abbreviation"
                          defaultValue={organization.abbreviation}
                          maxLength={10}
                          className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      {actionData?.errors?.abbreviation && (
                        <p className="mt-2 text-sm text-red-600">
                          {actionData.errors.abbreviation._errors[0]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <div>
                      <Form method="post" onSubmit={handleDelete}>
                        <input type="hidden" name="_action" value="delete" />
                        <button
                          type="submit"
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <TrashIcon
                            className="-ml-0.5 mr-2 h-4 w-4"
                            aria-hidden="true"
                          />
                          {showDeleteConfirm
                            ? "Confirm Delete"
                            : "Delete Organization"}
                        </button>
                      </Form>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        name="_action"
                        value="update"
                        disabled={isSubmitting}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        {isSubmitting ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </Form>
              </div>
            )}

            {/* Organization Information */}
            {!isEditing && (
              <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
                <div className="md:grid md:grid-cols-2 md:gap-6">
                  <div>
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Organization Details
                    </h3>
                    <div className="mt-5 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">
                          Owner
                        </h4>
                        <p className="mt-1 text-sm text-gray-900">
                          {organization.owner.firstName}{" "}
                          {organization.owner.lastName} (
                          {organization.owner.email})
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">
                          Teams
                        </h4>
                        <p className="mt-1 text-sm text-gray-900">
                          {organization.teams.length} teams
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">
                          Sport
                        </h4>
                        <p className="mt-1 text-sm text-gray-900">
                          {organization.sport.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 md:mt-0">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Logo
                    </h3>
                    <div className="mt-5">
                      {organization.logoUrl ? (
                        <div>
                          <img
                            src={organization.logoUrl}
                            alt={organization.name}
                            className="h-48 w-48 object-contain bg-gray-100 rounded-md"
                          />
                          {isOwner && (
                            <button
                              type="button"
                              className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                              Change Logo
                            </button>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="h-48 w-48 flex items-center justify-center bg-gray-100 rounded-md">
                            <span className="text-4xl font-bold text-gray-400">
                              {organization.abbreviation}
                            </span>
                          </div>
                          {isOwner && (
                            <button
                              type="button"
                              className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                              Upload Logo
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Teams List */}
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Teams
                </h3>
                {isOwner && (
                  <Link
                    to={`/dashboard/organizations/${organization.id}/teams/new`}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <PlusIcon
                      className="-ml-1 mr-2 h-4 w-4"
                      aria-hidden="true"
                    />
                    Add Team
                  </Link>
                )}
              </div>

              {organization.teams.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No teams yet.</p>
                  {isOwner && (
                    <div className="mt-4">
                      <Link
                        to={`/dashboard/organizations/${organization.id}/teams/new`}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        Create your first team
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-hidden bg-white shadow sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {organization.teams.map((team) => {
                      const canManageTeam =
                        isOwner || maintainedTeamIds.includes(team.id);

                      return (
                        <li key={team.id}>
                          <Link
                            to={`/dashboard/organizations/${organization.id}/teams/${team.id}`}
                            className="block hover:bg-gray-50"
                          >
                            <div className="px-4 py-4 sm:px-6">
                              <div className="flex items-center justify-between">
                                <div className="truncate">
                                  <div className="flex">
                                    <p className="truncate text-sm font-medium text-primary-600">
                                      {team.name}
                                    </p>
                                    {team.nickname && (
                                      <p className="ml-1 truncate text-sm text-gray-500">
                                        ({team.nickname})
                                      </p>
                                    )}
                                  </div>
                                  <div className="mt-2 flex">
                                    <div className="flex items-center text-sm text-gray-500">
                                      <p>{team._count.players} Players</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="ml-2 flex flex-shrink-0">
                                  {canManageTeam ? (
                                    <p className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                                      {isOwner ? "Owner" : "Maintainer"}
                                    </p>
                                  ) : (
                                    <p className="inline-flex rounded-full bg-gray-100 px-2 text-xs font-semibold leading-5 text-gray-800">
                                      Viewer
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Outlet />
    </div>
  );
}
