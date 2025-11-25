import { db } from '../db';
import { eq, and, desc, sql, inArray, gte, lte, like, or, not, count } from 'drizzle-orm';
import {
  campaigns,
  campaignTemplates,
  contactSegments,
  campaignRecipients,
  campaignAnalytics,
  campaignQueue,
  contacts,
  conversations,
  companies,
  plans,
  type Campaign,
  type CampaignTemplate,
  type ContactSegment,
  type InsertCampaign,
  type InsertCampaignTemplate,
  type InsertContactSegment,
  type SegmentFilterCriteria
} from '../../shared/schema';

interface CampaignFilters {
  status?: string;
  whatsapp_channel_type?: 'official' | 'unofficial';
  search?: string;
  sort_field?: string;
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

interface TemplateFilters {
  category?: string;
  whatsapp_channel_type?: 'official' | 'unofficial';
  whatsapp_template_category?: 'marketing' | 'utility' | 'authentication';
  whatsapp_template_status?: 'pending' | 'approved' | 'rejected' | 'disabled';
  is_active?: boolean;
}

export class CampaignService {

  async createCampaign(companyId: number, userId: number, campaignData: Partial<InsertCampaign>): Promise<Campaign> {
    try {
      
      

      try {
        await this.checkCampaignLimitations(companyId);
        
      } catch (limitError) {
        console.error('Campaign limitations check failed:', limitError);
        if (limitError instanceof Error) {
          console.error('Error details:', limitError.stack);
        }
        throw limitError;
      }

      const campaignInsertData = {
        companyId,
        createdById: userId,
        name: campaignData.name || 'Untitled Campaign',
        content: campaignData.content || '',
        status: 'draft' as const,
        ...campaignData
      };

      const [campaign] = await db.insert(campaigns).values(campaignInsertData).returning();

      

      if (campaignData.segmentId) {
        
        await this.populateCampaignRecipients(campaign.id, campaignData.segmentId);
      }

      return campaign;
    } catch (error) {
      console.error('Error in createCampaign:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create campaign: ${errorMessage}`);
    }
  }

  async getCampaigns(companyId: number, filters: CampaignFilters = {}): Promise<any[]> {
    try {
      const whereConditions = [eq(campaigns.companyId, companyId)];

      if (filters.status) {
        whereConditions.push(eq(campaigns.status, filters.status as "cancelled" | "scheduled" | "draft" | "running" | "paused" | "completed" | "failed"));
      }

      if (filters.whatsapp_channel_type) {
        whereConditions.push(eq(campaigns.whatsappChannelType, filters.whatsapp_channel_type));
      }

      if (filters.search) {
        whereConditions.push(
          or(
            like(campaigns.name, `%${filters.search}%`),
            like(campaigns.description, `%${filters.search}%`)
          )!
        );
      }

      const baseQuery = db.select({
        id: campaigns.id,
        name: campaigns.name,
        description: campaigns.description,
        status: campaigns.status,
        channelType: campaigns.channelType,
        campaignType: campaigns.campaignType,
        scheduledAt: campaigns.scheduledAt,
        totalRecipients: campaigns.totalRecipients,
        processedRecipients: campaigns.processedRecipients,
        successfulSends: campaigns.successfulSends,
        failedSends: campaigns.failedSends,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
        templateName: campaignTemplates.name,
        segmentName: contactSegments.name,
        creatorName: sql`users.full_name`
      })
      .from(campaigns)
      .leftJoin(campaignTemplates, eq(campaigns.templateId, campaignTemplates.id))
      .leftJoin(contactSegments, eq(campaigns.segmentId, contactSegments.id))
      .leftJoin(sql`users`, sql`campaigns.created_by_id = users.id`)
      .where(and(...whereConditions))
      .orderBy(desc(campaigns.createdAt));

      if (filters.limit && filters.offset) {
        return await baseQuery.limit(filters.limit).offset(filters.offset);
      } else if (filters.limit) {
        return await baseQuery.limit(filters.limit);
      } else {
        return await baseQuery;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get campaigns: ${errorMessage}`);
    }
  }

  async getCampaignById(companyId: number, campaignId: number): Promise<Campaign> {
    try {
      const [campaign] = await db.select()
        .from(campaigns)
        .where(and(
          eq(campaigns.id, campaignId),
          eq(campaigns.companyId, companyId)
        ));

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      return campaign;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get campaign: ${errorMessage}`);
    }
  }

  async updateCampaign(companyId: number, campaignId: number, updateData: Partial<Campaign>): Promise<Campaign> {
    try {
      const [campaign] = await db.update(campaigns)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(and(
          eq(campaigns.id, campaignId),
          eq(campaigns.companyId, companyId)
        ))
        .returning();

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      return campaign;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update campaign: ${errorMessage}`);
    }
  }

  async deleteCampaign(companyId: number, campaignId: number): Promise<{ success: boolean }> {
    try {
      const campaign = await this.getCampaignById(companyId, campaignId);

      if (['running', 'processing'].includes(campaign.status)) {
        throw new Error('Cannot delete a running campaign');
      }

      await db.delete(campaigns)
        .where(and(
          eq(campaigns.id, campaignId),
          eq(campaigns.companyId, companyId)
        ));

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete campaign: ${errorMessage}`);
    }
  }


  async startCampaign(companyId: number, campaignId: number): Promise<{ success: boolean; message: string }> {
    try {


      const campaign = await this.getCampaignById(companyId, campaignId);


      if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
        throw new Error('Campaign cannot be started from current status');
      }


      await this.updateCampaign(companyId, campaignId, {
        status: 'running',
        startedAt: new Date()
      });


      const queuedCount = await this.queueCampaignRecipients(campaignId);


      return { success: true, message: 'Campaign started successfully' };
    } catch (error) {
      console.error(`[Campaign Service] Error starting campaign:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to start campaign: ${errorMessage}`);
    }
  }

  async pauseCampaign(companyId: number, campaignId: number): Promise<{ success: boolean; message: string }> {
    try {
      await this.updateCampaign(companyId, campaignId, {
        status: 'paused',
        pausedAt: new Date()
      });

      await db.update(campaignQueue)
        .set({ status: 'cancelled' })
        .where(and(
          eq(campaignQueue.campaignId, campaignId),
          eq(campaignQueue.status, 'pending')
        ));

      return { success: true, message: 'Campaign paused successfully' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to pause campaign: ${errorMessage}`);
    }
  }

  async resumeCampaign(companyId: number, campaignId: number): Promise<{ success: boolean; message: string }> {
    try {
      const campaign = await this.getCampaignById(companyId, campaignId);

      if (campaign.status !== 'paused') {
        throw new Error('Campaign is not paused');
      }

      await this.updateCampaign(companyId, campaignId, {
        status: 'running',
        pausedAt: null
      });

      await this.queueCampaignRecipients(campaignId);

      return { success: true, message: 'Campaign resumed successfully' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to resume campaign: ${errorMessage}`);
    }
  }


  /**
   * Populates campaign recipients based on a segment.
   * 
   * IMPORTANT: Segments are dynamic criteria filters, not static contact lists.
   * This method calls getContactsBySegment with the current segment.criteria,
   * which means contact membership is recalculated each time based on current data.
   * Using the same segment for new campaigns will re-evaluate contacts and can
   * change the audience implicitly if contact data has changed since the segment
   * was created.
   */
  async populateCampaignRecipients(campaignId: number, segmentId: number): Promise<number> {
    try {
      const [segment] = await db.select()
        .from(contactSegments)
        .where(eq(contactSegments.id, segmentId));

      if (!segment) {
        throw new Error('Segment not found');
      }

      const segmentContacts = await this.getContactsBySegment(segment);

      const existingRecipients = await db.select({
          contactId: campaignRecipients.contactId,
          phone: contacts.phone
        })
        .from(campaignRecipients)
        .leftJoin(contacts, eq(campaignRecipients.contactId, contacts.id))
        .where(eq(campaignRecipients.campaignId, campaignId));

      const existingContactIds = new Set(existingRecipients.map(r => r.contactId));
      const existingPhones = new Set(
        existingRecipients
          .map(r => this.normalizePhoneNumber(r.phone || ''))
          .filter(phone => phone !== '')
      );



      const newContacts = segmentContacts.filter(contact => {

        if (existingContactIds.has(contact.id)) {
          return false;
        }


        const normalizedPhone = this.normalizePhoneNumber(contact.phone || '');
        if (normalizedPhone && existingPhones.has(normalizedPhone)) {
          return false;
        }

        return true;
      });

      await this.checkRecipientLimitations(segment.companyId, newContacts.length);

      const recipients = newContacts.map(contact => ({
        campaignId,
        contactId: contact.id,
        status: 'pending' as const,
        variables: this.extractContactVariables(contact)
      }));

      if (recipients.length > 0) {
        await db.insert(campaignRecipients).values(recipients);
      }

      await db.update(campaigns)
        .set({ totalRecipients: recipients.length })
        .where(eq(campaigns.id, campaignId));

      
      return recipients.length;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to populate recipients: ${errorMessage}`);
    }
  }

  /**
   * Gets contacts matching a segment's criteria.
   * 
   * IMPORTANT: Segments are dynamic filters, not static contact lists. This method
   * evaluates the segment's criteria against current contact data each time it's called.
   * Contact membership is recalculated based on current tags, dates, and other filters.
   * 
   * Note: Results are deduplicated by normalized phone number, which may reduce
   * the apparent number of contacts compared to raw filter matches.
   */
  async getContactsBySegment(segment: ContactSegment): Promise<any[]> {
    try {
      const criteria = segment.criteria as SegmentFilterCriteria;

      let whereConditions = [
        eq(contacts.companyId, segment.companyId),
        eq(contacts.isActive, true)
      ];

      whereConditions.push(sql`${contacts.phone} IS NOT NULL AND ${contacts.phone} != ''`);
      whereConditions.push(sql`LENGTH(REGEXP_REPLACE(${contacts.phone}, '[^0-9]', '', 'g')) <= 14`);


      const tagCondition = this.createTagFilterCondition(criteria.tags);
      if (tagCondition) {
        whereConditions.push(tagCondition);
      }

      if (criteria.created_after) {
        whereConditions.push(gte(contacts.createdAt, new Date(criteria.created_after)));
      }

      if (criteria.created_before) {
        whereConditions.push(lte(contacts.createdAt, new Date(criteria.created_before)));
      }

      if (criteria.excludedContactIds && criteria.excludedContactIds.length > 0) {
        whereConditions.push(not(inArray(contacts.id, criteria.excludedContactIds)));
      }

      const allContacts = await db
        .select()
        .from(contacts)
        .where(and(...whereConditions))
        .orderBy(desc(contacts.createdAt));



      const deduplicatedContacts = this.deduplicateContactsByPhone(allContacts);

      return deduplicatedContacts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get contacts by segment: ${errorMessage}`);
    }
  }

  async getContactsBySegmentWithDetails(segment: ContactSegment, limit: number = 50): Promise<any[]> {
    try {
      const criteria = segment.criteria as SegmentFilterCriteria;

      let whereConditions = [
        eq(contacts.companyId, segment.companyId),
        eq(contacts.isActive, true)
      ];

      whereConditions.push(sql`${contacts.phone} IS NOT NULL AND ${contacts.phone} != ''`);
      whereConditions.push(sql`LENGTH(REGEXP_REPLACE(${contacts.phone}, '[^0-9]', '', 'g')) <= 14`);


      const tagCondition = this.createTagFilterCondition(criteria.tags);
      if (tagCondition) {
        whereConditions.push(tagCondition);
      }

      if (criteria.created_after) {
        whereConditions.push(gte(contacts.createdAt, new Date(criteria.created_after)));
      }

      if (criteria.created_before) {
        whereConditions.push(lte(contacts.createdAt, new Date(criteria.created_before)));
      }

      if (criteria.excludedContactIds && criteria.excludedContactIds.length > 0) {
        whereConditions.push(not(inArray(contacts.id, criteria.excludedContactIds)));
      }

      const contactsWithActivity = await db
        .select({
          id: contacts.id,
          name: contacts.name,
          email: contacts.email,
          phone: contacts.phone,
          company: contacts.company,
          tags: contacts.tags,
          createdAt: contacts.createdAt,
          updatedAt: contacts.updatedAt,
          lastActivity: sql<Date | null>`MAX(${conversations.lastMessageAt})`.as('lastActivity')
        })
        .from(contacts)
        .leftJoin(conversations, eq(conversations.contactId, contacts.id))
        .where(and(...whereConditions))
        .groupBy(
          contacts.id,
          contacts.name,
          contacts.email,
          contacts.phone,
          contacts.company,
          contacts.tags,
          contacts.createdAt,
          contacts.updatedAt
        )
        .orderBy(desc(contacts.createdAt));



      const deduplicatedContacts = this.deduplicateContactsByPhone(contactsWithActivity);

      const limitedContacts = deduplicatedContacts.slice(0, limit);

      return limitedContacts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get contacts by segment with details: ${errorMessage}`);
    }
  }

  extractContactVariables(contact: any): Record<string, any> {
    return {
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      company: contact.company || ''
    };
  }

  /**
   * Creates a SQL condition for tag filtering with improved null handling and case-insensitive matching
   * @param tags Array of tags to filter by (can be undefined)
   * @returns SQL condition or null if no valid tags
   */
  private createTagFilterCondition(tags: string[] | undefined) {
    try {
      if (!tags || tags.length === 0) {
        return null;
      }


      const validTags = tags
        .filter((tag: string) => tag && typeof tag === 'string' && tag.trim().length > 0)
        .map((tag: string) => tag.trim().toLowerCase())
        .filter((tag: string) => tag.length <= 100); // Prevent extremely long tags

      if (validTags.length === 0) {
        return null;
      }



      const conditions = validTags.map(filterTag =>
        sql`EXISTS (
          SELECT 1
          FROM unnest(${contacts.tags}) AS contact_tag
          WHERE lower(trim(coalesce(contact_tag, ''))) = ${filterTag}
        )`
      );


      let combinedCondition;
      if (conditions.length === 1) {
        combinedCondition = conditions[0];
      } else {
        combinedCondition = conditions.reduce((acc, condition, index) => {
          if (index === 0) return condition;
          return sql`${acc} OR ${condition}`;
        });
      }

      return sql`
        ${contacts.tags} IS NOT NULL
        AND array_length(${contacts.tags}, 1) > 0
        AND (${combinedCondition})
      `;
    } catch (error) {
      console.error('[TagFilter] Error creating tag filter condition:', error);
      return null;
    }
  }

  private normalizePhoneNumber(phone: string): string {
    if (!phone) return '';

    let normalized = phone.replace(/[^\d+]/g, '');

    if (normalized.startsWith('+')) {
      return normalized;
    } else {
      normalized = normalized.replace(/^0+/, '');
      if (normalized.length > 10) {
        return '+' + normalized;
      }
      return normalized;
    }
  }

  /**
   * Deduplicates contacts by normalized phone number.
   * 
   * Only one contact per normalized phone number is retained. If multiple contacts
   * share the same normalized phone, the most recently created contact is kept.
   * 
   * This affects all segment-based audience building and may reduce the apparent
   * number of contacts compared to raw filter matches.
   */
  private deduplicateContactsByPhone(contacts: any[]): any[] {
    const phoneMap = new Map();

    contacts.forEach(contact => {
      const normalizedPhone = this.normalizePhoneNumber(contact.phone || '');

      if (normalizedPhone && !phoneMap.has(normalizedPhone)) {
        phoneMap.set(normalizedPhone, contact);
      } else if (normalizedPhone) {
        const existingContact = phoneMap.get(normalizedPhone);
        if (new Date(contact.createdAt) > new Date(existingContact.createdAt)) {
          phoneMap.set(normalizedPhone, contact);
        }
      }
    });

    return Array.from(phoneMap.values());
  }

  async detectDuplicateContacts(companyId: number): Promise<{ duplicates: any[], totalDuplicates: number }> {
    try {
      const allContacts = await db.select()
        .from(contacts)
        .where(and(
          eq(contacts.companyId, companyId),
          eq(contacts.isActive, true),
          sql`${contacts.phone} IS NOT NULL AND ${contacts.phone} != ''`
        ))
        .orderBy(contacts.phone, desc(contacts.createdAt));

      const phoneGroups = new Map();

      allContacts.forEach(contact => {
        if (contact.phone) {
          const normalizedPhone = this.normalizePhoneNumber(contact.phone);
          if (!phoneGroups.has(normalizedPhone)) {
            phoneGroups.set(normalizedPhone, []);
          }
          phoneGroups.get(normalizedPhone).push(contact);
        }
      });

      const duplicates: any[] = [];
      let totalDuplicates = 0;

      phoneGroups.forEach((contactGroup, phone) => {
        if (contactGroup.length > 1) {
          duplicates.push({
            phone,
            normalizedPhone: phone,
            contacts: contactGroup,
            count: contactGroup.length
          });
          totalDuplicates += contactGroup.length - 1;
        }
      });

      

      return { duplicates, totalDuplicates };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to detect duplicate contacts: ${errorMessage}`);
    }
  }


  async queueCampaignRecipients(campaignId: number): Promise<number> {
    try {


      const recipients = await db.select()
        .from(campaignRecipients)
        .where(and(
          eq(campaignRecipients.campaignId, campaignId),
          eq(campaignRecipients.status, 'pending')
        ));



      const campaign = await db.select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId));

      if (!campaign[0]) {
        throw new Error('Campaign not found');
      }

      const campaignData = campaign[0];



      const channelIds = (campaignData.channelIds as number[]) || [];
      const singleChannelId = campaignData.channelId;


      const availableChannelIds = channelIds.length > 0 ? channelIds : (singleChannelId ? [singleChannelId] : []);

      if (availableChannelIds.length === 0) {
        console.error(`[Campaign Service] No channel connections found for campaign ${campaignId}`);
        throw new Error('No channel connections configured for this campaign');
      }



      const rateLimits = (campaignData.rateLimitSettings as any) || {};
      const antiBanSettings = (campaignData.antiBanSettings as any) || {};
      const delayBetweenMessages = rateLimits.delay_between_messages || 6;
      const randomDelayRange = rateLimits.random_delay_range || [3, 10];

      let baseDelayMultiplier = 1;
      switch (antiBanSettings.mode) {
        case 'conservative':
          baseDelayMultiplier = 3;
          break;
        case 'moderate':
          baseDelayMultiplier = 1.5;
          break;
        case 'aggressive':
          baseDelayMultiplier = 0.8;
          break;
      }

      const queueItems = recipients.map((recipient, index) => {
        let baseDelay = index * delayBetweenMessages * baseDelayMultiplier;

        let randomDelay = 0;
        if (antiBanSettings.randomizeDelay) {
          const minDelay = antiBanSettings.minDelay || 3;
          const maxDelay = antiBanSettings.maxDelay || 15;
          randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        } else {
          randomDelay = Math.floor(
            Math.random() * (randomDelayRange[1] - randomDelayRange[0] + 1)
          ) + randomDelayRange[0];
        }

        const scheduledFor = new Date(Date.now() + (baseDelay + randomDelay) * 1000);


        const assignedChannelId = availableChannelIds[index % availableChannelIds.length];

        return {
          campaignId,
          recipientId: recipient.id,
          accountId: assignedChannelId, // FIXED: Assign actual channel ID instead of null
          scheduledFor,
          priority: 1,
          status: 'pending' as const
        };
      });




      if (queueItems.length > 0) {
        await db.insert(campaignQueue).values(queueItems);

      }

      return queueItems.length;
    } catch (error) {
      console.error(`[Campaign Service] Error queueing recipients:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to queue recipients: ${errorMessage}`);
    }
  }


  async createTemplate(companyId: number, userId: number, templateData: Partial<InsertCampaignTemplate>): Promise<CampaignTemplate> {
    try {

      const templateDataAny = templateData as any;
      let whatsappTemplateCategory = templateDataAny.whatsappTemplateCategory;
      if (!whatsappTemplateCategory || whatsappTemplateCategory.trim() === '') {
        whatsappTemplateCategory = null;
      } else {

        const allowedCategories = ['marketing', 'utility', 'authentication'];
        if (!allowedCategories.includes(whatsappTemplateCategory)) {
          whatsappTemplateCategory = null;
        }
      }

      const templateValues = {
        companyId,
        createdById: userId,
        name: templateData.name || 'Untitled Template',
        content: templateData.content || '',
        ...templateData,
        whatsappTemplateCategory
      } as any;

      const [template] = await db.insert(campaignTemplates).values(templateValues).returning();

      return template;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create template: ${errorMessage}`);
    }
  }

  async getTemplates(companyId: number, filters: TemplateFilters = {}): Promise<CampaignTemplate[]> {
    try {
      const whereConditions = [eq(campaignTemplates.companyId, companyId)];

      if (filters.category) {
        whereConditions.push(eq(campaignTemplates.category, filters.category));
      }

      if (filters.whatsapp_channel_type) {
        whereConditions.push(eq(campaignTemplates.whatsappChannelType, filters.whatsapp_channel_type));
      }

      if (filters.whatsapp_template_category) {
        whereConditions.push(eq(campaignTemplates.whatsappTemplateCategory, filters.whatsapp_template_category));
      }

      if (filters.whatsapp_template_status) {
        whereConditions.push(eq(campaignTemplates.whatsappTemplateStatus, filters.whatsapp_template_status));
      }

      if (filters.is_active !== undefined) {
        whereConditions.push(eq(campaignTemplates.isActive, filters.is_active));
      }

      const query = db.select()
        .from(campaignTemplates)
        .where(and(...whereConditions))
        .orderBy(desc(campaignTemplates.createdAt));

      return await query;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get templates: ${errorMessage}`);
    }
  }

  async getTemplate(companyId: number, templateId: number): Promise<CampaignTemplate | null> {
    try {
      const [template] = await db.select().from(campaignTemplates)
        .where(and(
          eq(campaignTemplates.id, templateId),
          eq(campaignTemplates.companyId, companyId)
        ));

      return template || null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get template: ${errorMessage}`);
    }
  }

  async updateTemplate(companyId: number, userId: number, templateId: number, updateData: Partial<CampaignTemplate>): Promise<CampaignTemplate> {
    try {
      const existingTemplate = await this.getTemplate(companyId, templateId);
      if (!existingTemplate) {
        throw new Error('Template not found');
      }

      if (existingTemplate.createdById !== userId) {
        throw new Error('You can only edit templates you created');
      }

      const [template] = await db.update(campaignTemplates)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(and(
          eq(campaignTemplates.id, templateId),
          eq(campaignTemplates.companyId, companyId)
        ))
        .returning();

      if (!template) {
        throw new Error('Template not found');
      }

      return template;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update template: ${errorMessage}`);
    }
  }

  async deleteTemplate(companyId: number, userId: number, templateId: number): Promise<void> {
    try {
      const existingTemplate = await this.getTemplate(companyId, templateId);
      if (!existingTemplate) {
        throw new Error('Template not found');
      }

      if (existingTemplate.createdById !== userId) {
        throw new Error('You can only delete templates you created');
      }

      const [campaignUsage] = await db.select({ count: sql`COUNT(*)` })
        .from(campaigns)
        .where(and(
          eq(campaigns.templateId, templateId),
          eq(campaigns.companyId, companyId)
        ));

      if (parseInt(String(campaignUsage.count)) > 0) {
        throw new Error('Cannot delete template that is being used in campaigns');
      }

      await db.delete(campaignTemplates)
        .where(and(
          eq(campaignTemplates.id, templateId),
          eq(campaignTemplates.companyId, companyId)
        ));
    } catch (error) {
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete template: ${errorMessage}`);
    }
  }


  async getCampaignStats(companyId: number): Promise<{
    totalCampaigns: number;
    activeCampaigns: number;
    totalRecipients: number;
    messagesDelivered: number;
    deliveryRate: number;
  }> {
    try {
      const campaignStats = await db.select({
        total: sql`COUNT(*)`,
        active: sql`COUNT(*) FILTER (WHERE status IN ('running', 'scheduled'))`,
        completed: sql`COUNT(*) FILTER (WHERE status = 'completed')`,
        failed: sql`COUNT(*) FILTER (WHERE status = 'failed')`
      })
      .from(campaigns)
      .where(eq(campaigns.companyId, companyId));

      const recipientStats = await db.select({
        totalRecipients: sql`COALESCE(SUM(total_recipients), 0)`,
        successfulSends: sql`COALESCE(SUM(successful_sends), 0)`,
        failedSends: sql`COALESCE(SUM(failed_sends), 0)`
      })
      .from(campaigns)
      .where(eq(campaigns.companyId, companyId));

      const campaignResult = campaignStats[0];
      const recipientResult = recipientStats[0];

      const totalCampaigns = parseInt(String(campaignResult.total)) || 0;
      const activeCampaigns = parseInt(String(campaignResult.active)) || 0;
      const totalRecipients = parseInt(String(recipientResult.totalRecipients)) || 0;
      const messagesDelivered = parseInt(String(recipientResult.successfulSends)) || 0;
      const deliveryRate = totalRecipients > 0 ? (messagesDelivered / totalRecipients) * 100 : 0;

      return {
        totalCampaigns,
        activeCampaigns,
        totalRecipients,
        messagesDelivered,
        deliveryRate: Math.round(deliveryRate * 10) / 10
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get campaign stats: ${errorMessage}`);
    }
  }



  async validateCampaignContent(content: string): Promise<{
    score: number;
    issues: string[];
    suggestions: string[];
  }> {
    try {
      const issues: string[] = [];
      const suggestions: string[] = [];
      let score = 100;

      if (content.length < 10) {
        issues.push('Message is too short');
        score -= 20;
      } else if (content.length > 1000) {
        issues.push('Message is too long (may be truncated)');
        score -= 10;
      }

      const spamWords = ['FREE', 'URGENT', 'CLICK NOW', 'LIMITED TIME', 'ACT NOW'];
      const upperCaseWords = content.split(' ').filter(word =>
        word.length > 3 && word === word.toUpperCase()
      );

      if (upperCaseWords.length > 3) {
        issues.push('Too many uppercase words (may appear as spam)');
        score -= 15;
      }

      const foundSpamWords = spamWords.filter(word =>
        content.toUpperCase().includes(word)
      );

      if (foundSpamWords.length > 0) {
        issues.push(`Contains potential spam words: ${foundSpamWords.join(', ')}`);
        score -= 10 * foundSpamWords.length;
      }

      const variablePattern = /\{\{(\w+)\}\}/g;
      const variables = content.match(variablePattern);

      if (!variables || variables.length === 0) {
        suggestions.push('Consider adding personalization variables like {{name}} or {{company}}');
        score -= 5;
      }

      const ctaWords = ['visit', 'click', 'call', 'reply', 'contact', 'book', 'schedule'];
      const hasCTA = ctaWords.some(word =>
        content.toLowerCase().includes(word)
      );

      if (!hasCTA) {
        suggestions.push('Consider adding a clear call-to-action');
        score -= 5;
      }

      score = Math.max(0, score);

      return {
        score,
        issues,
        suggestions
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to validate content: ${errorMessage}`);
    }
  }


  async createSegment(companyId: number, userId: number, segmentData: Partial<InsertContactSegment>, excludedContactIds?: number[]): Promise<ContactSegment & { contactCount: number }> {
    try {
      const criteria = (segmentData.criteria as SegmentFilterCriteria) || {};


      if (criteria.tags && Array.isArray(criteria.tags)) {
        criteria.tags = criteria.tags
          .filter((tag: any) => tag && typeof tag === 'string' && tag.trim().length > 0)
          .map((tag: string) => tag.trim())
          .filter((tag: string) => tag.length <= 100) // Prevent extremely long tags
          .slice(0, 50); // Limit number of tags to prevent performance issues
      }

      const enhancedCriteria = {
        ...criteria,
        excludedContactIds: excludedContactIds || []
      };

      const segmentValues = {
        companyId,
        createdById: userId,
        name: segmentData.name || 'Untitled Segment',
        criteria: enhancedCriteria,
        description: segmentData.description || null
      } as any;

      const [segment] = await db.insert(contactSegments).values(segmentValues).returning();

      const contactCount = await this.calculateSegmentContactCount(segment);

      await db.update(contactSegments)
        .set({ contactCount })
        .where(eq(contactSegments.id, segment.id));

      return { ...segment, contactCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create segment: ${errorMessage}`);
    }
  }

  async getSegments(companyId: number): Promise<ContactSegment[]> {
    try {
      return await db.select().from(contactSegments)
        .where(eq(contactSegments.companyId, companyId))
        .orderBy(desc(contactSegments.createdAt));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get segments: ${errorMessage}`);
    }
  }

  async getSegment(companyId: number, segmentId: number): Promise<ContactSegment | null> {
    try {
      const [segment] = await db.select().from(contactSegments)
        .where(and(
          eq(contactSegments.id, segmentId),
          eq(contactSegments.companyId, companyId)
        ));



      return segment || null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get segment: ${errorMessage}`);
    }
  }

  async updateSegment(companyId: number, userId: number, segmentId: number, updateData: Partial<InsertContactSegment>): Promise<ContactSegment> {
    try {
      const existingSegment = await this.getSegment(companyId, segmentId);
      if (!existingSegment) {
        throw new Error('Segment not found');
      }

      if (existingSegment.createdById !== userId) {
        throw new Error('You can only edit segments you created');
      }



      let sanitizedUpdateData = { ...updateData };
      const updateDataAny = updateData as any;
      
      if (updateData.criteria || updateDataAny.excludedContactIds !== undefined) {
        const criteria = (updateData.criteria as any) || { ...(existingSegment.criteria as any) };
        

        if (updateDataAny.excludedContactIds !== undefined) {
          criteria.excludedContactIds = updateDataAny.excludedContactIds || [];
        } else if (!criteria.excludedContactIds) {
          criteria.excludedContactIds = [];
        }
        

        if (criteria.tags && Array.isArray(criteria.tags)) {
          criteria.tags = criteria.tags
            .filter((tag: any) => tag && typeof tag === 'string' && tag.trim().length > 0)
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag.length <= 100)
            .slice(0, 50);
        }
        
        sanitizedUpdateData.criteria = criteria;
        

        delete (sanitizedUpdateData as any).excludedContactIds;
      }

      const [segment] = await db.update(contactSegments)
        .set({
          ...sanitizedUpdateData,
          updatedAt: new Date()
        })
        .where(and(
          eq(contactSegments.id, segmentId),
          eq(contactSegments.companyId, companyId)
        ))
        .returning();

      if (!segment) {
        throw new Error('Segment not found');
      }


      const contactCount = await this.calculateSegmentContactCount(segment);


      const [updatedSegment] = await db.update(contactSegments)
        .set({ contactCount })
        .where(eq(contactSegments.id, segment.id))
        .returning();


      return { ...updatedSegment, contactCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update segment: ${errorMessage}`);
    }
  }

  async deleteSegment(companyId: number, userId: number, segmentId: number): Promise<void> {
    try {
      const existingSegment = await this.getSegment(companyId, segmentId);
      if (!existingSegment) {
        throw new Error('Segment not found');
      }

      if (existingSegment.createdById !== userId) {
        throw new Error('You can only delete segments you created');
      }

      const [campaignUsage] = await db.select({ count: sql`COUNT(*)` })
        .from(campaigns)
        .where(and(
          eq(campaigns.segmentId, segmentId),
          eq(campaigns.companyId, companyId)
        ));

      if (parseInt(String(campaignUsage.count)) > 0) {
        throw new Error('Cannot delete segment that is being used in campaigns');
      }

      await db.delete(contactSegments)
        .where(and(
          eq(contactSegments.id, segmentId),
          eq(contactSegments.companyId, companyId)
        ));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete segment: ${errorMessage}`);
    }
  }

  async calculateSegmentContactCount(segment: ContactSegment): Promise<number> {
    try {
      const contacts = await this.getContactsBySegment(segment);
      return contacts.length;
    } catch (error) {
      return 0;
    }
  }

  async getCampaignAnalytics(_companyId: number, campaignId: number): Promise<any> {
    try {
      const [analytics] = await db.select()
        .from(campaignAnalytics)
        .where(eq(campaignAnalytics.campaignId, campaignId))
        .orderBy(desc(campaignAnalytics.recordedAt))
        .limit(1);

      const realtimeStats = await this.calculateRealtimeStats(campaignId);

      return {
        ...analytics,
        realtime: realtimeStats
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get campaign analytics: ${errorMessage}`);
    }
  }

  async calculateRealtimeStats(campaignId: number): Promise<any> {
    try {
      const stats = await db.select({
        total_recipients: sql`COUNT(*)`,
        pending: sql`COUNT(*) FILTER (WHERE status = 'pending')`,
        processing: sql`COUNT(*) FILTER (WHERE status = 'processing')`,
        sent: sql`COUNT(*) FILTER (WHERE status = 'sent')`,
        delivered: sql`COUNT(*) FILTER (WHERE status = 'delivered')`,
        read: sql`COUNT(*) FILTER (WHERE status = 'read')`,
        failed: sql`COUNT(*) FILTER (WHERE status = 'failed')`
      })
      .from(campaignRecipients)
      .where(eq(campaignRecipients.campaignId, campaignId));

      const result = stats[0];
      const total = parseInt(result.total_recipients as string) || 0;

      return {
        total_recipients: total,
        pending: parseInt(result.pending as string) || 0,
        processing: parseInt(result.processing as string) || 0,
        sent: parseInt(result.sent as string) || 0,
        delivered: parseInt(result.delivered as string) || 0,
        read: parseInt(result.read as string) || 0,
        failed: parseInt(result.failed as string) || 0,
        delivery_rate: total > 0 ? ((parseInt(result.delivered as string) || 0) / total * 100).toFixed(2) : 0,
        read_rate: total > 0 ? ((parseInt(result.read as string) || 0) / total * 100).toFixed(2) : 0,
        failure_rate: total > 0 ? ((parseInt(result.failed as string) || 0) / total * 100).toFixed(2) : 0
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to calculate realtime stats: ${errorMessage}`);
    }
  }

  async recordAnalyticsSnapshot(campaignId: number): Promise<any> {
    try {
      const stats = await this.calculateRealtimeStats(campaignId);

      await db.insert(campaignAnalytics).values({
        campaignId,
        recordedAt: new Date(),
        totalRecipients: stats.total_recipients,
        messagesSent: stats.sent,
        messagesDelivered: stats.delivered,
        messagesRead: stats.read,
        messagesFailed: stats.failed,
        deliveryRate: String(stats.delivery_rate),
        readRate: String(stats.read_rate),
        failureRate: String(stats.failure_rate)
      });

      return stats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to record analytics snapshot: ${errorMessage}`);
    }
  }


  async personalizeMessage(content: string, variables: Record<string, any>): Promise<string> {
    try {
      let personalizedContent = content;

      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        personalizedContent = personalizedContent.replace(regex, variables[key] || '');
      });

      return personalizedContent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to personalize message: ${errorMessage}`);
    }
  }




  async checkCampaignLimitations(companyId: number): Promise<void> {
    try {
      

      const [company] = await db.select({
        plan: companies.plan
      })
      .from(companies)
      .where(eq(companies.id, companyId));

      if (!company) {
        throw new Error('Company not found');
      }

      

      let planLimitations: any = null;
      if (company.plan && company.plan !== 'free') {
        
        const [plan] = await db.select()
          .from(plans)
          .where(eq(plans.name, company.plan));
        planLimitations = plan;
        
      }

      if (!planLimitations) {
        
        planLimitations = {
          maxCampaigns: 5,
          maxCampaignRecipients: 1000,
          campaignFeatures: ['basic_campaigns']
        };
      }

      

      const maxCampaigns = planLimitations.maxCampaigns || 5;
      

      
      const campaignCountResult = await db.select({
        count: count()
      })
      .from(campaigns)
      .where(and(
        eq(campaigns.companyId, companyId),
        not(eq(campaigns.status, 'cancelled'))
      ));

      const campaignCount = campaignCountResult[0];
      

      if (!campaignCount) {
        
        return;
      }

      

      if (Number(campaignCount.count) >= maxCampaigns) {
        throw new Error(`Campaign limit reached. Your plan allows ${maxCampaigns} campaigns. Please upgrade your plan or delete existing campaigns.`);
      }

      

    } catch (error) {
      console.error('Error in checkCampaignLimitations:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Campaign limitation check failed: ${errorMessage}`);
    }
  }

  async checkRecipientLimitations(companyId: number, newRecipientsCount: number): Promise<void> {
    try {
      

      const [company] = await db.select({
        plan: companies.plan
      })
      .from(companies)
      .where(eq(companies.id, companyId));

      if (!company) {
        throw new Error('Company not found');
      }

      

      let planLimitations: any = null;
      if (company.plan && company.plan !== 'free') {
        
        const [plan] = await db.select()
          .from(plans)
          .where(eq(plans.name, company.plan));
        planLimitations = plan;
        
      }

      if (!planLimitations) {
        
        planLimitations = {
          maxCampaignRecipients: 1000
        };
      }

      const maxCampaignRecipients = planLimitations.maxCampaignRecipients || 1000;
      

      const [recipientCount] = await db.select({
        count: count()
      })
      .from(campaignRecipients)
      .leftJoin(campaigns, eq(campaignRecipients.campaignId, campaigns.id))
      .where(eq(campaigns.companyId, companyId));

      const totalRecipients = Number(recipientCount.count) + newRecipientsCount;
      

      if (totalRecipients > maxCampaignRecipients) {
        throw new Error(`Campaign recipient limit exceeded. Your plan allows ${maxCampaignRecipients} total recipients. Adding ${newRecipientsCount} recipients would exceed this limit. Please upgrade your plan.`);
      }

      

    } catch (error) {
      console.error('Error in checkRecipientLimitations:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Recipient limitation check failed: ${errorMessage}`);
    }
  }
}
