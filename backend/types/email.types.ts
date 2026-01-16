
export interface EmailAccountConfig {
    email: string;
    password: string;
    imapHost: string;
    imapPort: number;
}

export interface parsedEmail {
    messageId: string;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  textBody?: string;
  htmlBody?: string;
  folder: string;
  hasAttachments: boolean;
  receivedAt: Date;
}