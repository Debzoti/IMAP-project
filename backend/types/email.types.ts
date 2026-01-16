export interface EmailAccountConfig {
    email: string;
    password: string;
    imapHost: string;
    imapPort: number;
}

export interface parsedEmail {
    subject: string;
    body: string;
    from: string;
    to: string;
    cc: string;
    bcc: string;
    date: string;
    id: string;
}