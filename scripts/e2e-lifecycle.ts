import { randomUUID } from "crypto";
import { existsSync, readFileSync } from "fs";

loadEnvLocal();
const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
const SERVICES = ["tax", "formation", "insurance", "notary", "bookkeeping"] as const;
type ServiceType = typeof SERVICES[number];

function pdfBlob(label: string) {
  const body = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [3 0 R] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${label.length + 46} >>
stream
BT /F1 12 Tf 20 120 Td (${label}) Tj ET
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF`;
  return new Blob([body], { type: "application/pdf" });
}

async function createTestUser(role: string, email: string, legalName: string) {
  const password = `E2E-${randomUUID()}-Secure!`;
  const signup = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name: legalName }),
  });
  const signupBody = await readJson(signup);
  if (!signup.ok) throw new Error(`Signup failed for ${email}: ${signup.status} ${JSON.stringify(signupBody)}`);

  const promoted = await promoteTestUser(signupBody.userId, role);

  const cookie = await loginTestUser(email, password);
  return { ...promoted.profile, cookie };
}

async function promoteTestUser(authUserId: string, role: string) {
  const token = process.env.E2E_TEST_TOKEN || process.env.SESSION_SECRET || process.env.INSFORGE_SERVICE_KEY || "";
  const res = await fetch(`${BASE}/api/test/e2e-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-e2e-token": token },
    body: JSON.stringify({ authUserId, role }),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(`E2E profile promotion failed: ${res.status} ${JSON.stringify(body)}`);
  return body;
}

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equals = trimmed.indexOf("=");
    if (equals < 1) continue;
    const key = trimmed.slice(0, equals).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(equals + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function loginTestUser(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(body)}`);
  const cookie = extractCookie(res);
  if (!cookie) throw new Error(`Login did not return a session cookie for ${email}`);
  return cookie;
}

async function request(path: string, cookie: string, init: RequestInit = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Cookie: cookie,
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${init.method || "GET"} ${url} failed ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function extractCookie(res: Response) {
  const getSetCookie = (res.headers as any).getSetCookie?.() as string[] | undefined;
  const cookieHeader = getSetCookie?.[0] || res.headers.get("set-cookie") || "";
  return cookieHeader.split(";")[0];
}

async function main() {
  const stamp = Date.now();
  const client = await createTestUser("client", `e2e-client-${stamp}@dfgbusiness.test`, "E2E Client");
  const staff = await createTestUser("super_admin", `e2e-staff-${stamp}@dfgbusiness.test`, "E2E Staff");

  const results = [];
  for (const serviceType of SERVICES) {
    results.push(await runServiceLifecycle(serviceType, client, staff));
  }

  console.log(JSON.stringify({
    success: results.every((result) => result.finalStatus === "completed" && result.progress === 100),
    clientProfileId: client.id,
    staffProfileId: staff.id,
    results,
  }, null, 2));
}

async function runServiceLifecycle(
  serviceType: ServiceType,
  client: { id: string; auth_user_id: string; email: string; cookie: string },
  staff: { id: string; auth_user_id: string; email: string; cookie: string },
) {
  const intake = await request("/api/services/enroll", client.cookie, {
    method: "POST",
    body: JSON.stringify({
      serviceType,
      action: "submit",
      intakeData: intakeFor(serviceType),
    }),
  });
  const enrollmentId = intake.enrollmentId;
  if (!enrollmentId) throw new Error(`${serviceType} enrollment was not created`);

  if (!intake.workflowId) {
    await request(`/api/workflows/${serviceType}`, client.cookie, {
      method: "POST",
      body: JSON.stringify({ enrollmentId, clientEmail: client.email, clientName: "E2E Client", userId: client.id }),
    }).catch((error) => {
      console.warn(`[e2e] ${serviceType} workflow start skipped:`, error.message);
    });
  }

  const cases = await request(`/api/admin/cases?service=${serviceType}`, staff.cookie);
  if (!cases.cases?.some((c: any) => c.id === enrollmentId)) throw new Error(`Submitted ${serviceType} case did not appear in staff queue`);

  const missing = await request(`/api/cases/${enrollmentId}/missing-docs`, staff.cookie, {
    method: "POST",
    body: JSON.stringify({ documentName: `${serviceLabel(serviceType)} verification document`, instructions: "Upload the latest document for E2E verification." }),
  });
  const uploadUrl = new URL(missing.uploadUrl);
  const token = uploadUrl.pathname.split("/").pop();
  if (!token) throw new Error("Missing document upload token was not generated");

  const docForm = new FormData();
  docForm.append("files", pdfBlob(`E2E ${serviceType} source document`), `${serviceType}-source-e2e.pdf`);
  await request(`/api/vault/public-upload?token=${token}`, client.cookie, { method: "POST", body: docForm });

  await request(`/api/cases/${enrollmentId}/messages`, staff.cookie, {
    method: "POST",
    body: JSON.stringify({ message: `Your ${serviceLabel(serviceType)} documents are received. We are preparing your case.` }),
  });
  await request(`/api/cases/${enrollmentId}/messages`, client.cookie, {
    method: "POST",
    body: JSON.stringify({ message: "Thank you. Please proceed." }),
  });

  const deliverableForm = new FormData();
  deliverableForm.append("title", `E2E ${serviceLabel(serviceType)} Deliverable`);
  deliverableForm.append("description", "Automated deliverable for lifecycle verification.");
  deliverableForm.append("requiresApproval", "true");
  deliverableForm.append("file", pdfBlob(`E2E ${serviceType} deliverable`), `${serviceType}-deliverable-e2e.pdf`);
  const delivered = await request(`/api/cases/${enrollmentId}/deliverables`, staff.cookie, { method: "POST", body: deliverableForm });

  await request(`/api/cases/${enrollmentId}/approve`, client.cookie, {
    method: "POST",
    body: JSON.stringify({ deliverableId: delivered.deliverable.id }),
  });
  await request(`/api/cases/${enrollmentId}/complete`, staff.cookie, { method: "POST" });

  const finalCase = await request(`/api/cases/${enrollmentId}`, client.cookie);
  const enrollment = finalCase.case?.enrollment;
  if (enrollment?.status !== "completed" || enrollment?.progress !== 100) {
    throw new Error(`${serviceType} case did not complete correctly`);
  }

  return {
    serviceType,
    enrollmentId,
    finalStatus: enrollment.status,
    progress: enrollment.progress,
  };
}

function intakeFor(serviceType: ServiceType) {
  const common = { notes: "Automated E2E lifecycle probe" };
  if (serviceType === "tax") return { ...common, filingType: "personal", taxYear: "2025", incomeTypes: ["W-2"] };
  if (serviceType === "formation") return { ...common, businessName: `E2E Test LLC ${Date.now()}`, entityType: "LLC", state: "DE", ownerCount: 1 };
  if (serviceType === "insurance") return { ...common, zipCode: "19720", vehicleYear: "2022", vehicleMake: "Toyota", vehicleModel: "Camry", coverageLevel: "standard" };
  if (serviceType === "notary") return { ...common, sessionType: "in_person", documentType: "Affidavit", appointmentPreference: "weekday" };
  return { ...common, businessType: "service", monthlyTransactions: "50", bankConnection: "manual" };
}

function serviceLabel(serviceType: ServiceType) {
  return {
    tax: "Tax Preparation",
    formation: "Business Formation",
    insurance: "Auto Insurance",
    notary: "Notary Services",
    bookkeeping: "Bookkeeping",
  }[serviceType];
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
