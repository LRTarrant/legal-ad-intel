import { getMdlAttorneysByRole } from "@/lib/queries/mdl-attorneys";
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

  return (
    <AttorneyTable
      attorneys={attorneys}
      defaultCollapsed={defaultCollapsed}
      role={role}
    />
  );
}
