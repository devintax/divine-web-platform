import { ConversationInbox } from "@/components/portal/ConversationInbox";

export default function MessagesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-ink">Secure Messages</h1>
        <p className="mt-1 text-sm text-muted">Direct messages, staff follow-ups, and DFG announcements.</p>
      </div>
      <ConversationInbox />
    </div>
  );
}
