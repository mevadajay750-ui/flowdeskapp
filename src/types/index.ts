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
  chatRoomId?: string;
  createdAt: any;
  updatedAt?: any;
}

export type ChatRoomType = "project" | "group" | "direct";

export interface ChatRoomParticipant {
  uid: string;
  name: string;
  role?: string;
  photoURL?: string;
}

export interface ChatRoom {
  id: string;
  type: ChatRoomType;
  name?: string;
  projectId?: string;
  participants: ChatRoomParticipant[];
  // Denormalized UIDs for Firestore array-contains queries
  participantIds: string[];
  createdBy: string;
  createdAt: any;
  lastMessage?: {
    text?: string;
    senderId: string;
    createdAt: any;
    messageType: string;
  };
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


