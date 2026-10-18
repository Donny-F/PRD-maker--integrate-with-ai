import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: "ADMIN" | "USER";
    accessToken?: string;
  }

  interface Session {
    accessToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "ADMIN" | "USER";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "ADMIN" | "USER";
    accessToken?: string;
  }
}
