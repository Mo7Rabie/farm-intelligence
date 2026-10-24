"use client";

import InviteMember from "../invite-member";
import MembersPanel from "../members-panel";
import { useData } from "../use-data";

export default function MembersPage() {
  const { loading, orgId, role, error } = useData();

  if (loading) return <p className="text-zinc-500">جارٍ التحميل...</p>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">إدارة الأعضاء</h1>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {role === "owner" && orgId ? (
        <>
          <InviteMember orgId={orgId} />
          <MembersPanel orgId={orgId} />
        </>
      ) : (
        <p className="text-sm text-zinc-500">هذه الصفحة متاحة لمالك المؤسسة فقط.</p>
      )}
    </div>
  );
}