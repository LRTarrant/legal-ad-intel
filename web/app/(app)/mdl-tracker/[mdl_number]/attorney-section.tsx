import { getMdlAttorneysByRole, getMdlAttorneysAll } from "@/lib/queries/mdl-attorneys";
import AttorneyTable from "./attorney-table";

interface Props {
  mdlNumber: number;
  role: "Plaintiff" | "Defendant";
  defaultCollapsed?: boolean;
}

export default async function AttorneySection({
  mdlNumber,
  role,
  defaultCollapsed,
}: Props) {
  const attorneys = await getMdlAttorneysByRole(mdlNumber, role);

  if (attorneys.length === 0) {
    // For Plaintiff: fall back to showing all attorneys if any exist
    if (role === "Plaintiff") {
      const allAttorneys = await getMdlAttorneysAll(mdlNumber);
      if (allAttorneys.length > 0) {
        return (
          <AttorneyTable
            attorneys={allAttorneys}
            defaultCollapsed={defaultCollapsed}
            role="All Attorneys (role classification pending)"
          />
        );
      }
      return (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-white mb-4">
            {role} Attorneys
          </h2>
          <p className="text-sm text-slate-400">
            Attorney data not yet available.
          </p>
        </section>
      );
    }
    // For Defendant: show nothing to avoid duplicate fallback display
    return null;
  }

  return (
    <AttorneyTable
      attorneys={attorneys}
      defaultCollapsed={defaultCollapsed}
      role={role}
    />
  );
}
