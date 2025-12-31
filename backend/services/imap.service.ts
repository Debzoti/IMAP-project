import { ImapFlow } from 'imapflow';
import { EventEmitter } from 'events';
import { EmailAccountConfig } from '../types/email.types';

export class ImapService extends EventEmitter {
    private client: ImapFlow;
    private accountConfig: EmailAccountConfig;
    private isConnected: boolean = false;

    constructor(accountConfig: EmailAccountConfig) {
        super();
        this.accountConfig = accountConfig;
        this.client = new ImapFlow({
            host: accountConfig.imapHost,
            port: accountConfig.imapPort,
            secure: true,
            auth: {
                user: accountConfig.email,
                pass: accountConfig.password,
            },
            logger: false, // Set to true for debugging
        });
    }

    async connect(): Promise<void> {
        try {
            await this.client.connect();
            this.isConnected = true;
            console.log(`✅ IMAP connected: ${this.accountConfig.email}`);

            // Setup error handling
            this.client.on('error', (err) => {
                console.error(`❌ IMAP error for ${this.accountConfig.email}:`, err);
                this.emit('error', err);
            });

            this.client.on('close', () => {
                console.log(`🔌 IMAP connection closed: ${this.accountConfig.email}`);
                this.isConnected = false;
                this.emit('close');
            });

            // Start monitoring INBOX
            await this.setupIdleMode();
        } catch (error) {
            console.error(`❌ Failed to connect ${this.accountConfig.email}:`, error);
            throw error;
        }
    }

    private async setupIdleMode(): Promise<void> {
        if (!this.isConnected) return;

        try {
            // Open INBOX
            await this.client.mailboxOpen('INBOX');
            console.log(`📬 Monitoring INBOX for ${this.accountConfig.email}`);

            // Listen for new emails
            this.client.on('exists', async (data) => {
                console.log(`📨 New email event: ${data.count} messages in mailbox`);
                // We emit the count, but usually we want to fetch the new messages
                // data.count is the total number of messages
                // data.prevCount is the previous number
                if (data.count > data.prevCount) {
                    this.emit('newMail', data.count - data.prevCount);
                }
            });

            // ImapFlow handles IDLE automatically when mailbox is open and no other command is running
            // But we can explicitly call idle() if we want to be sure, though it's usually automatic.
            // However, to ensure we receive updates, we just keep the mailbox open.

        } catch (error) {
            console.error('Error opening INBOX:', error);
        }
    }

    async fetchEmails(folder: string = 'INBOX', daysBack: number = 30): Promise<number[]> {
        if (!this.isConnected) {
            throw new Error('IMAP not connected');
        }

        try {
            const lock = await this.client.getMailboxLock(folder);
            try {
                const since = new Date();
                since.setDate(since.getDate() - daysBack);

                // Search for messages since the date
                // ImapFlow search returns an array of sequence numbers or UIDs
                const messages = await this.client.search({ since: since }, { uid: true });

                console.log(`📧 Found ${messages.length} emails in ${folder}`);
                return messages;
            } finally {
                lock.release();
            }
        } catch (error) {
            console.error('Error fetching emails:', error);
            throw error;
        }
    }

    async fetchEmailById(uid: number): Promise<Buffer> {
        if (!this.isConnected) {
            throw new Error('IMAP not connected');
        }

        try {
            // We don't need to lock if we are just fetching a specific message usually, 
            // but it's good practice if we are selecting a mailbox.
            // Assuming INBOX is already open or we open it.
            // ImapFlow fetchOne is convenient.

            // Note: fetchOne takes a sequence number or UID. 
            // We need to specify we are using UID.
            const message = await this.client.fetchOne(uid.toString(), { source: true }, { uid: true });

            if (!message || !message.source) {
                throw new Error('Email not found or no source');
            }

            return message.source;
        } catch (error) {
            console.error(`Error fetching email ${uid}:`, error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.isConnected) {
            await this.client.logout();
            this.isConnected = false;
        }
    }
}
