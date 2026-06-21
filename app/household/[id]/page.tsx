import { redirect } from "next/navigation";
export default async function HouseholdDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/staff/${id}`);
}
