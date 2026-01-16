import { ImapFlow } from 'imapflow';
import { EventEmitter } from 'events';
import type { EmailAccountConfig } from '../../types/email.types';

export class ImapService extends EventEmitter {
    private client: ImapFlow;
    private accountConfig: EmailAccountConfig;
    private isConnected: boolean = false;

    constructor(accountConfig: EmailAccountConfig) {
        super();
        this.accountConfig = accountConfig;
        this.client = new ImapFlow({
            host: this.accountConfig.imapHost,
            port: this.accountConfig.imapPort,
            secure: true,
            auth: {
                user: this.accountConfig.email,
                pass: this.accountConfig.password
            },
            logger: false  // Set to console to see debug output
        });
    }

    async connect(): Promise<void> {
        try {

            await this.client.connect();
            this.isConnected = true;

            //handle errors
            this.client.on("error", (error) => {
                console.error(`error occured for ${this.accountConfig.email}`, error);
                this.emit("error", error);
            });

            //closing imap connections
            this.client.on("close", () => {
                console.log(`imap connection closed for ${this.accountConfig.email}`);
                this.isConnected = false;
                this.emit("end");
            });

            //set up idle mode for poll emails 
            await this.setupIdleMode();
        } catch (error) {
            console.error(`error connecting to imap for ${this.accountConfig.email}`, error);
            this.emit("error", error);
        }

    }


    async setupIdleMode(): Promise<void> {
        if (!this.isConnected) return;

        try {
            this.client.mailboxOpen("INBOX", { readOnly: true });

            //liasdten fro emails everytime incoming 
            this.client.on('exists', (data) => {
                if (data.count > data.prevCount) {
                    this.emit("email", data.count - data.prevCount);
                }
            })
        } catch (error) {
            console.error(`error opening inbox for ${this.accountConfig.email}`, error);
            this.emit("error", error);
        }
    }

    async fetchEmails(folder: string = 'INBOX', daysBack: number): Promise<number[] | null> {
        if (!this.isConnected) {
            throw new Error('IMap not connected');
        }

        try {
            //lock mailbox of folder to prevent issues 
            const lock = await this.client.getMailboxLock(folder);
            try {
                const since = new Date();
                since.setDate(since.getDate() - daysBack);
                // Search for messages since the date
                const messages = await this.client.search({ since: since }, { uid: true });

                console.log(`📧 Found ${messages ? messages.length : 0} emails in ${folder}`);
                return messages ? messages : [];
            } finally{
                lock.release()
            }
        } catch (error) {
            console.error('Error fetching emails:', error);
            throw error;
        }

    }

    async fetchEmailById(uid:number) : Promise<Buffer[]>{
        if (!this.isConnected) {
            throw new Error('IMap not connected');
        }
        try {
             const message = await this.client.fetchOne(uid.toString(), { source: true }, { uid: true });
        
            if (!message || !message.source) {
                throw new Error('Email not found or no source');
            }
            return [message.source];
        } catch (error) {
            console.error('Error fetching email by id:', error);
            throw error;
        }
    }

    async disconnect() : Promise<void>{
        if (!this.isConnected) return;
        try {
            await this.client.logout();
            this.isConnected = false;
            console.log(`imap connection closed for ${this.accountConfig.email}`);
        } catch (error) {
            console.error(`error disconnecting imap for ${this.accountConfig.email}`, error);
            this.emit("error", error);
        }
    }

}