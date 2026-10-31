"use client";

import InviteMember from "../invite-member";
import MembersPanel from "../members-panel";
import { useData } from "../use-data";
import { useLang } from "../i18n";

export default function MembersPage() {
  const { loading, orgId, role, error } = useData();
  const { t } = useLang();

  if (loading) {
    return <p className="text-zinc-500">{t("members.loading")}</p>;
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">
        {t("members.title")}
      </h1>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {role === "owner" && orgId ? (
        <>
          <InviteMember orgId={orgId} />
          <MembersPanel orgId={orgId} />
        </>
      ) : (
        <p className="text-sm text-zinc-500">
          {t("members.ownerOnly")}
        </p>
      )}
    </div>
  );
}