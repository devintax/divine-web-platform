import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createNotification } from "@/lib/notifications";
import { can } from "@/lib/rbac/can";
import type { UserRole } from "@/lib/rbac/roles";

export type ConversationType = "direct" | "group" | "broadcast" | "case";
export type ConversationAudience =
  | "all_clients"
  | "all_staff"
  | "tax_clients"
  | "formation_clients"
  | "insurance_clients"
  | "notary_clients"
  | "bookkeeping_clients";

export type ConversationSession = {
  profileId: string;
  role: UserRole;
  legalName?: string | null;
  email?: string | null;
};

const STAFF_ROLES = ["support", "tax_intern", "broker", "specialist", "notary", "accountant", "manager", "super_admin"];
const SERVICE_AUDIENCE: Partial<Record<ConversationAudience, string>> = {
  tax_clients: "tax",
  formation_clients: "formation",
  insurance_clients: "insurance",
  notary_clients: "notary",
  bookkeeping_clients: "bookkeeping",
};

function uniq(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean).map(String)));
}

function directKey(a: string, b: string) {
  return [a, b].sort().join(":");
}

function displayName(profile: any) {
  return profile?.legal_name || profile?.email || "Unknown user";
}

function messagePreview(body?: string | null) {
  const clean = String(body || "").replace(/\s+/g, " ").trim();
  return clean.length > 120 ? `${clean.slice(0, 117)}...` : clean;
}

export function canSendBroadcast(role: UserRole) {
  return can(role, "send_bulk_notifications");
}

export function canStartStaffConversation(role: UserRole) {
  return can(role, "join_any_live_chat") || can(role, "send_email_to_client");
}

export async function listConversationRecipients(session: ConversationSession, search: string) {
  if (!canStartStaffConversation(session.role)) return [];
  const term = search.trim();
  const admin = getSupabaseAdmin();
  let query = admin
    .from("user_profiles")
    .select("id,legal_name,email,role,phone")
    .neq("id", session.profileId)
    .order("legal_name", { ascending: true })
    .limit(40);

  if (term) {
    query = query.or(`legal_name.ilike.%${term}%,email.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function resolveBroadcastRecipients(audience: ConversationAudience, senderId: string) {
  const admin = getSupabaseAdmin();
  if (audience === "all_clients") {
    const { data, error } = await admin.from("user_profiles").select("id").eq("role", "client");
    if (error) throw error;
    return uniq((data || []).map((row: any) => row.id).filter((id: string) => id !== senderId));
  }

  if (audience === "all_staff") {
    const { data, error } = await admin.from("user_profiles").select("id").in("role", STAFF_ROLES);
    if (error) throw error;
    return uniq((data || []).map((row: any) => row.id).filter((id: string) => id !== senderId));
  }

  const serviceType = SERVICE_AUDIENCE[audience];
  if (!serviceType) return [];
  const { data, error } = await admin
    .from("service_enrollments")
    .select("user_id")
    .eq("service_type", serviceType);
  if (error) throw error;
  return uniq((data || []).map((row: any) => row.user_id).filter((id: string) => id !== senderId));
}

export async function createConversation(params: {
  session: ConversationSession;
  type: ConversationType;
  title?: string;
  participantIds?: string[];
  audience?: ConversationAudience;
  initialMessage?: string;
}) {
  const admin = getSupabaseAdmin();
  const type = params.type;
  const initialMessage = params.initialMessage?.trim();
  let participantIds = uniq([params.session.profileId, ...(params.participantIds || [])]);
  let audienceType: string | null = null;
  let title = params.title?.trim() || null;
  let key: string | null = null;

  if (type === "direct") {
    if (!canStartStaffConversation(params.session.role) && params.session.role !== "client") {
      throw new Error("You are not allowed to start conversations");
    }
    if (participantIds.length !== 2) throw new Error("Direct conversations need exactly one recipient");
    key = directKey(participantIds[0], participantIds[1]);
    const { data: existing } = await admin
      .from("conversations")
      .select("id")
      .eq("type", "direct")
      .eq("direct_key", key)
      .limit(1);
    if (existing?.[0]?.id) {
      if (initialMessage) {
        await sendConversationMessage({
          session: params.session,
          conversationId: existing[0].id,
          body: initialMessage,
        });
      }
      return { id: existing[0].id, reused: true };
    }
  }

  if (type === "group") {
    if (!canStartStaffConversation(params.session.role)) throw new Error("Only staff can create group conversations");
    if (participantIds.length < 3) throw new Error("Group conversations need at least two recipients");
    if (!title) title = "Group conversation";
  }

  if (type === "broadcast") {
    if (!canSendBroadcast(params.session.role)) throw new Error("Only managers and super admins can send broadcasts");
    if (!params.audience) throw new Error("Broadcast audience is required");
    audienceType = params.audience;
    participantIds = uniq([params.session.profileId, ...(await resolveBroadcastRecipients(params.audience, params.session.profileId))]);
    if (participantIds.length < 2) throw new Error("No recipients matched this broadcast audience");
    if (!title) title = "DFG broadcast";
  }

  const now = new Date().toISOString();
  const { data: conversation, error } = await admin
    .from("conversations")
    .insert({
      type,
      title,
      direct_key: key,
      created_by: params.session.profileId,
      audience_type: audienceType,
      audience_filter: audienceType ? { audience: audienceType } : {},
      last_message_at: initialMessage ? now : null,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error) throw error;

  const participantRows = participantIds.map((userId) => ({
    conversation_id: conversation.id,
    user_id: userId,
    role: userId === params.session.profileId ? "owner" : "member",
    last_read_at: userId === params.session.profileId ? now : null,
  }));
  const { error: participantError } = await admin.from("conversation_participants").insert(participantRows);
  if (participantError) throw participantError;

  if (initialMessage) {
    await sendConversationMessage({
      session: params.session,
      conversationId: conversation.id,
      body: initialMessage,
      skipConversationUpdate: true,
    });
  }

  return { id: conversation.id, recipientCount: participantRows.length - 1, reused: false };
}

export async function listConversations(session: ConversationSession) {
  const admin = getSupabaseAdmin();
  const { data: memberships, error: membershipError } = await admin
    .from("conversation_participants")
    .select("*")
    .eq("user_id", session.profileId)
    .eq("is_archived", false);
  if (membershipError) throw membershipError;

  const conversationIds = (memberships || []).map((row: any) => row.conversation_id);
  if (!conversationIds.length) return [];

  const [{ data: conversations }, { data: allParticipants }, { data: recentMessages }] = await Promise.all([
    admin.from("conversations").select("*").in("id", conversationIds).order("last_message_at", { ascending: false, nullsFirst: false }),
    admin.from("conversation_participants").select("*").in("conversation_id", conversationIds),
    admin.from("conversation_messages").select("*").in("conversation_id", conversationIds).eq("is_deleted", false).order("created_at", { ascending: false }).limit(500),
  ]);

  const userIds = uniq((allParticipants || []).map((row: any) => row.user_id));
  const { data: profiles } = userIds.length
    ? await admin.from("user_profiles").select("id,legal_name,email,role,avatar_url").in("id", userIds)
    : { data: [] };

  const profilesById = new Map((profiles || []).map((profile: any) => [profile.id, profile]));
  const membershipByConversation = new Map((memberships || []).map((row: any) => [row.conversation_id, row]));
  const participantsByConversation = new Map<string, any[]>();
  for (const row of allParticipants || []) {
    const list = participantsByConversation.get(row.conversation_id) || [];
    list.push({ ...row, profile: profilesById.get(row.user_id) || null });
    participantsByConversation.set(row.conversation_id, list);
  }

  const messagesByConversation = new Map<string, any[]>();
  for (const row of recentMessages || []) {
    const list = messagesByConversation.get(row.conversation_id) || [];
    list.push(row);
    messagesByConversation.set(row.conversation_id, list);
  }

  return (conversations || []).map((conversation: any) => {
    const participants = participantsByConversation.get(conversation.id) || [];
    const myMembership = membershipByConversation.get(conversation.id);
    const messages = messagesByConversation.get(conversation.id) || [];
    const lastMessage = messages[0] || null;
    const lastReadAt = myMembership?.last_read_at ? new Date(myMembership.last_read_at).getTime() : 0;
    const unreadCount = messages.filter((message) => (
      message.sender_id !== session.profileId &&
      new Date(message.created_at).getTime() > lastReadAt
    )).length;
    const otherParticipants = participants.filter((participant) => participant.user_id !== session.profileId);
    const fallbackTitle = conversation.type === "direct"
      ? displayName(otherParticipants[0]?.profile)
      : otherParticipants.map((participant) => displayName(participant.profile)).slice(0, 3).join(", ");

    return {
      ...conversation,
      title: conversation.title || fallbackTitle || "Conversation",
      participants,
      lastMessage,
      preview: messagePreview(lastMessage?.body),
      unreadCount,
    };
  });
}

export async function listConversationMessages(session: ConversationSession, conversationId: string) {
  const admin = getSupabaseAdmin();
  const membership = await requireConversationMembership(session.profileId, conversationId);
  const [{ data: messages, error }, { data: participants }] = await Promise.all([
    admin.from("conversation_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(200),
    admin.from("conversation_participants").select("*").eq("conversation_id", conversationId),
  ]);
  if (error) throw error;

  const userIds = uniq([...(participants || []).map((row: any) => row.user_id), ...(messages || []).map((row: any) => row.sender_id)]);
  const { data: profiles } = userIds.length
    ? await admin.from("user_profiles").select("id,legal_name,email,role,avatar_url").in("id", userIds)
    : { data: [] };
  const profilesById = new Map((profiles || []).map((profile: any) => [profile.id, profile]));

  await admin
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", session.profileId);

  return {
    membership,
    messages: (messages || []).map((message: any) => ({
      ...message,
      sender: profilesById.get(message.sender_id) || null,
    })),
    participants: (participants || []).map((participant: any) => ({
      ...participant,
      profile: profilesById.get(participant.user_id) || null,
    })),
  };
}

export async function sendConversationMessage(params: {
  session: ConversationSession;
  conversationId: string;
  body: string;
  skipConversationUpdate?: boolean;
}) {
  const body = params.body.trim();
  if (!body) throw new Error("Message is required");
  if (body.length > 4000) throw new Error("Message is too long");

  const admin = getSupabaseAdmin();
  await requireConversationMembership(params.session.profileId, params.conversationId);

  const { data: message, error } = await admin
    .from("conversation_messages")
    .insert({
      conversation_id: params.conversationId,
      sender_id: params.session.profileId,
      body,
    })
    .select("*")
    .single();
  if (error) throw error;

  const now = new Date().toISOString();
  if (!params.skipConversationUpdate) {
    await admin
      .from("conversations")
      .update({ last_message_at: now, updated_at: now })
      .eq("id", params.conversationId);
  }
  await admin
    .from("conversation_participants")
    .update({ last_read_at: now })
    .eq("conversation_id", params.conversationId)
    .eq("user_id", params.session.profileId);

  const { data: recipients } = await admin
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", params.conversationId)
    .neq("user_id", params.session.profileId)
    .eq("is_muted", false);

  await Promise.all((recipients || []).map((recipient: any) => createNotification({
    userId: recipient.user_id,
    title: "New secure message",
    body: `${params.session.legalName || "A Divine Financial Group team member"} sent you a message.`,
    type: "message",
    href: "/portal/messages",
    relatedResourceType: "conversation",
    relatedResourceId: params.conversationId,
  })));

  return message;
}

export async function markConversationRead(session: ConversationSession, conversationId: string) {
  await requireConversationMembership(session.profileId, conversationId);
  const { error } = await getSupabaseAdmin()
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", session.profileId);
  if (error) throw error;
}

async function requireConversationMembership(userId: string, conversationId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("conversation_participants")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error("Conversation not found");
  return data;
}
