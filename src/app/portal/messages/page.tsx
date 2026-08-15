import { ConversationInbox } from "@/components/portal/ConversationInbox";

export default function MessagesPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-ink">Secure Messages</h1>
            <p className="mt-1 text-sm text-muted">Human staff messaging for client support, case follow-ups, and DFG announcements.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase text-[#0B4DA2]">Human Staff</span>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase text-green-700">Secure Thread</span>
          </div>
        </div>
      </div>
      <ConversationInbox />
    </div>
  );
}
