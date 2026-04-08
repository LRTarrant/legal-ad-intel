import { Sidebar } from "./sidebar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-cloud overflow-auto">
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-8 md:pt-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
