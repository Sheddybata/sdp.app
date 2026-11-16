import { redirect } from "next/navigation";
import { isAuthenticated } from "@/app/actions/auth";
import {
  getManualConstituencyLinksAction,
  getUnmappedConstituenciesAction,
} from "@/app/actions/constituencies";
import { ConstituencyMappingClient } from "./ConstituencyMappingClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ConstituencyMappingPage() {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }

  const [unmapped, manual] = await Promise.all([
    getUnmappedConstituenciesAction(),
    getManualConstituencyLinksAction(),
  ]);

  return (
    <ConstituencyMappingClient
      initialUnmapped={unmapped}
      initialManualLinks={manual.links || {}}
    />
  );
}
