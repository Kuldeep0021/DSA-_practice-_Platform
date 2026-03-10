import { getAuth } from "@/lib/firebaseAdmin";

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
}

export class RequestAuthError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = "RequestAuthError";
    this.statusCode = statusCode;
  }
}

export async function authenticateRequest(request: Request): Promise<AuthenticatedUser> {
  const authorization = request.headers.get("authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw new RequestAuthError("Missing Authorization bearer token.");
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    throw new RequestAuthError("Authorization token is empty.");
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
    };
  } catch {
    throw new RequestAuthError("Invalid or expired authentication token.");
  }
}
