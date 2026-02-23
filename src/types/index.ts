export type UserRole = "admin" | "employee" | "freelancer";

export type UserStatus = "pending" | "approved" | "rejected";

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  contactNumber: string;
  designation: string;
  skills: string[];
  role: UserRole;
  status: UserStatus;
  idProofUrl?: string;
  createdAt: any;
}

export type ProjectStatus = "active" | "completed" | "on_hold" | "archived";

export interface Project {
  id: string;
  name: string;
  clientName: string;
  description: string;
  techStack: string[];
  startDate: string;
  endDate?: string;
  status: ProjectStatus;
  createdBy: string;
  members: string[];
  createdAt: any;
  updatedAt?: any;
}

