import { StateDataSourcesAdmin } from "./state-data-sources-admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "State Data Sources | Admin",
};

export default function AdminStateDataSourcesPage() {
  return <StateDataSourcesAdmin />;
}
