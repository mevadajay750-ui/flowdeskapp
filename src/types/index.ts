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
  photoURL?: string;
  updatedAt?: any;
}

export type ProjectStatus = "active" | "completed" | "on_hold" | "archived";

export interface ProjectMember {
  uid: string;
  projectRole: string;
  assignedAt: any;
}

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
  members: ProjectMember[];
  // Denormalized list of member user IDs to support efficient queries and rules
  memberIds?: string[];
  createdAt: any;
  updatedAt?: any;
}

export type MessageType = "text" | "image" | "file" | "code";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  messageType: MessageType;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: any;
}

export type TimesheetStatus = "pending" | "approved" | "rejected";

export interface Timesheet {
  id: string;
  userId: string;
  userName: string;
  projectId: string;
  projectName: string;
  date: string; // ISO date
  hours: number;
  taskDescription: string;
  status: TimesheetStatus;
  rejectionComment?: string;
  createdAt: any;
  updatedAt?: any;
}


