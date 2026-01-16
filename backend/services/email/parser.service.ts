import type { parsedEmail } from "../../types/email.types";
import type ParsedMail from "mailparser";
import { simpleParser } from "mailparser";

export class EmailParser {

    private extractEmail(addressObject: ParsedMail.AddressObject | ParsedMail.AddressObject[] | undefined): string {
        if (!addressObject) return '';

        const addresses = Array.isArray(addressObject) ? addressObject : [addressObject];
        return addresses
            .flatMap(addr => addr.value)
            .map(addr => addr.address || '')
            .filter(Boolean)
            .join(', ');
    }

    async parsedEmail(emailBuffer: Buffer, folder: string = 'INBOX')
        : Promise<parsedEmail> {

        const parsed = await simpleParser(emailBuffer)

        return {
            messageId: parsed.messageId || `${Date.now()}-${Math.random()}`,
            subject: parsed.subject || '(No Subject)',
            from: this.extractEmail(parsed.from),
            to: this.extractEmail(parsed.to),
            cc: this.extractEmail(parsed.cc),
            bcc: this.extractEmail(parsed.bcc),
            textBody: parsed.text,
            htmlBody: parsed.html ? parsed.html.toString() : undefined,
            folder,
            hasAttachments: (parsed.attachments?.length || 0) > 0,
            receivedAt: parsed.date || new Date(),
        };
    }
}