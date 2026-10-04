import ClientTabs from "@/components/ClientTabs";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <ClientTabs clientId={id} />
      {children}
    </>
  );
}
