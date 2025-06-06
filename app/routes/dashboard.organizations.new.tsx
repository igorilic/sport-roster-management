import {
  json,
  LoaderFunctionArgs,
  redirect,
  ActionFunctionArgs,
} from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { requireAuth } from "~/services/auth.server";
import { z } from "zod";
import { db } from "~/services/db.server";
import { useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

// Sport cards data
const sportOptions = [
  {
    id: "AMERICAN_FOOTBALL",
    name: "American Football",
    icon: "🏈",
    enabled: true,
    description:
      "Manage football teams with offense, defense, and special teams.",
  },
  {
    id: "BASKETBALL",
    name: "Basketball",
    icon: "🏀",
    enabled: false,
    description: "Coming soon: Manage basketball teams.",
  },
  {
    id: "VOLLEYBALL",
    name: "Volleyball",
    icon: "🏐",
    enabled: false,
    description: "Coming soon: Manage volleyball teams.",
  },
  {
    id: "WATERPOLO",
    name: "Water Polo",
    icon: "🤽",
    enabled: false,
    description: "Coming soon: Manage water polo teams.",
  },
];

// Validation schema for organization
const OrganizationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  city: z.string().min(1, "City is required").max(100),
  abbreviation: z.string().min(1, "Abbreviation is required").max(10),
  sport: z.enum(["AMERICAN_FOOTBALL", "BASKETBALL", "VOLLEYBALL", "WATERPOLO"]),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  return json({ user, sportOptions });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  const formData = await request.formData();

  const name = formData.get("name") as string;
  const city = formData.get("city") as string;
  const abbreviation = formData.get("abbreviation") as string;
  const sport = formData.get("sport") as string;

  // Validate the form data
  const validationResult = OrganizationSchema.safeParse({
    name,
    city,
    abbreviation,
    sport,
  });

  if (!validationResult.success) {
    return json({ errors: validationResult.error.format() }, { status: 400 });
  }

  // Check if selected sport is enabled
  const selectedSport = sportOptions.find((s) => s.id === sport);
  if (!selectedSport?.enabled) {
    return json(
      { error: "Selected sport is not available yet" },
      { status: 400 }
    );
  }

  try {
    // Create the organization
    const organization = await db.organization.create({
      data: {
        name,
        city,
        abbreviation,
        sport: sport as any, // Cast to the proper enum type
        ownerId: user.id,
      },
    });

    // Redirect to the new organization page
    return redirect(`/dashboard/organizations/${organization.id}`);
  } catch (error) {
    return json({ error: "Failed to create organization" }, { status: 500 });
  }
}

export default function NewOrganization() {
  const { sportOptions } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [step, setStep] = useState<"sport" | "details">("sport");

  const handleSportSelect = (sportId: string) => {
    const sport = sportOptions.find((s) => s.id === sportId);
    if (sport?.enabled) {
      setSelectedSport(sportId);
    }
  };

  const continueToDetails = () => {
    if (selectedSport) {
      setStep("details");
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Create a New Organization
        </h1>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          <div className="max-w-3xl mx-auto">
            {step === "sport" ? (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Select a Sport
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {sportOptions.map((sport) => (
                    <div
                      key={sport.id}
                      onClick={() => handleSportSelect(sport.id)}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        sport.enabled
                          ? selectedSport === sport.id
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-300 hover:border-primary-400"
                          : "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">{sport.icon}</span>
                          <h3 className="text-lg font-medium text-gray-900">
                            {sport.name}
                          </h3>
                        </div>
                        {selectedSport === sport.id && (
                          <CheckCircleIcon className="h-6 w-6 text-primary-600" />
                        )}
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {sport.description}
                      </p>
                      {!sport.enabled && (
                        <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Coming Soon
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={continueToDetails}
                    disabled={!selectedSport}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Organization Details
                </h2>

                {actionData?.error && (
                  <div className="mb-4 rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          {actionData.error}
                        </h3>
                      </div>
                    </div>
                  </div>
                )}

                <Form method="post" className="space-y-6">
                  <input
                    type="hidden"
                    name="sport"
                    value={selectedSport || ""}
                  />

                  <div>
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
                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="e.g. Acme Sports Team"
                      />
                    </div>
                    {actionData?.errors?.name && (
                      <p className="mt-2 text-sm text-red-600">
                        {actionData.errors.name._errors[0]}
                      </p>
                    )}
                  </div>

                  <div>
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
                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="e.g. New York"
                      />
                    </div>
                    {actionData?.errors?.city && (
                      <p className="mt-2 text-sm text-red-600">
                        {actionData.errors.city._errors[0]}
                      </p>
                    )}
                  </div>

                  <div>
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
                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="e.g. AST"
                        maxLength={10}
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Maximum 10 characters. This will be used when the logo is
                      not available.
                    </p>
                    {actionData?.errors?.abbreviation && (
                      <p className="mt-2 text-sm text-red-600">
                        {actionData.errors.abbreviation._errors[0]}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep("sport")}
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Back
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Creating..." : "Create Organization"}
                    </button>
                  </div>
                </Form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
