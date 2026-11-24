export type SavedInbox = {
  address: string;
  password: string;
  token: string;
  accountId: string;
  createdAt: string;
};

export type MailParticipant = {
  address: string;
  name: string;
};

export type MessageSummary = {
  id: string;
  msgid: string;
  from: MailParticipant;
  to: MailParticipant[];
  subject: string;
  intro: string;
  seen: boolean;
  isDeleted: boolean;
  hasAttachments: boolean;
  size: number;
  createdAt: string;
  updatedAt: string;
};

export type MessageAttachment = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  downloadUrl?: string;
};

export type MessageDetail = MessageSummary & {
  text: string;
  html: string[];
  attachments: MessageAttachment[];
};

export type MailResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export type ExtractedCode = {
  code: string;
  kind: 'numeric' | 'alphanumeric';
  confidence: 'high' | 'medium';
};
