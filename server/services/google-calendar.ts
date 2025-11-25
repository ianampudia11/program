import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Request, Response } from 'express';
import { storage } from '../storage';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];


const API_TIMEOUT_MS = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_STATUS_CODES = [429, 500, 503];

class GoogleCalendarService {
  constructor() {
  }

  /**
   * Helper to wrap API calls with timeout and retry logic
   * Retries on 429, 500, 503 with exponential backoff
   */
  private async withRetry<T>(
    apiCall: () => Promise<T>,
    retryCount: number = 0
  ): Promise<T> {
    try {

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`API call timed out after ${API_TIMEOUT_MS}ms`));
        }, API_TIMEOUT_MS);
      });


      const result = await Promise.race([apiCall(), timeoutPromise]);
      return result;
    } catch (error: any) {
      const statusCode = error?.response?.status || error?.code;
      const shouldRetry =
        retryCount < MAX_RETRIES &&
        (RETRY_STATUS_CODES.includes(statusCode) || error?.message?.includes('timeout'));

      if (shouldRetry) {

        const delayMs = Math.pow(2, retryCount) * 1000;
        console.log(
          `Retrying Google Calendar API call (attempt ${retryCount + 1}/${MAX_RETRIES}) after ${delayMs}ms. Error: ${error.message}`
        );

        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.withRetry(apiCall, retryCount + 1);
      }


      throw error;
    }
  }

  /**
   * Get Google OAuth credentials from super admin settings
   */
  private async getApplicationCredentials(): Promise<{
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  } | null> {
    try {
      const credentials = await storage.getAppSetting('google_calendar_oauth');

      if (!credentials || !credentials.value) {
        console.error('Google Calendar OAuth not configured in admin settings');
        return null;
      }

      const config = credentials.value as any;
      if (!config.enabled || !config.client_id || !config.client_secret) {
        console.error('Google Calendar OAuth not properly configured or disabled');
        return null;
      }

      return {
        clientId: config.client_id,
        clientSecret: config.client_secret,
        redirectUri: config.redirect_uri || `${process.env.BASE_URL || 'http://localhost:9000'}/api/google/calendar/callback`
      };
    } catch (error) {
      console.error('Error getting application Google credentials:', error);
      return null;
    }
  }

  /**
   * Create a Google OAuth2 client using application credentials
   */
  private async getOAuth2Client(): Promise<OAuth2Client | null> {
    const credentials = await this.getApplicationCredentials();

    if (!credentials) {
      return null;
    }

    return new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );
  }

  /**
   * Generate an authentication URL for Google Calendar
   */
  public async getAuthUrl(userId: number, companyId: number): Promise<string | null> {
    const oauth2Client = await this.getOAuth2Client();

    if (!oauth2Client) {
      return null;
    }

    const state = Buffer.from(JSON.stringify({ userId, companyId })).toString('base64');

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state,
      prompt: 'consent'
    });
  }

  /**
   * Handle the OAuth callback and save tokens
   */
  public async handleAuthCallback(req: Request, res: Response): Promise<void> {
    const code = req.query.code as string;
    const stateParam = req.query.state as string;

    if (!code) {
      res.status(400).send('Authorization code not provided');
      return;
    }

    try {
      const stateData = JSON.parse(Buffer.from(stateParam, 'base64').toString());
      const userId = stateData.userId;
      const companyId = stateData.companyId;

      if (!userId || !companyId) {
        res.status(400).send('User ID or Company ID not found in state parameter');
        return;
      }

      const oauth2Client = await this.getOAuth2Client();

      if (!oauth2Client) {
        res.status(400).send('Google Calendar OAuth not configured in admin settings');
        return;
      }

      const { tokens } = await oauth2Client.getToken(code);

      const googleTokens = {
        access_token: tokens.access_token || '',
        refresh_token: tokens.refresh_token || undefined,
        id_token: tokens.id_token || undefined,
        token_type: tokens.token_type || undefined,
        expiry_date: tokens.expiry_date || undefined,
        scope: tokens.scope || undefined
      };

      await storage.saveGoogleTokens(userId, companyId, googleTokens);

      res.redirect('/settings?google_auth=success');
    } catch (error) {
      console.error('Error handling Google auth callback:', error);
      res.status(500).send('Failed to authenticate with Google');
    }
  }

  /**
   * Get an authorized Google Calendar client for a user
   */
  public async getCalendarClient(userId: number, companyId: number): Promise<calendar_v3.Calendar | null> {
    try {
      const tokens = await storage.getGoogleTokens(userId, companyId);

      if (!tokens) {
        console.error(`No Google tokens found for user ${userId} in company ${companyId}`);
        return null;
      }

      const oauth2Client = await this.getOAuth2Client();

      if (!oauth2Client) {
        console.error('Google Calendar OAuth not configured in admin settings');
        return null;
      }

      oauth2Client.setCredentials(tokens);

      if (tokens.expiry_date && tokens.expiry_date < Date.now() && tokens.refresh_token) {
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();

          const googleTokens = {
            access_token: credentials.access_token || '',
            refresh_token: credentials.refresh_token || undefined,
            id_token: credentials.id_token || undefined,
            token_type: credentials.token_type || undefined,
            expiry_date: credentials.expiry_date || undefined,
            scope: credentials.scope || undefined
          };

          await storage.saveGoogleTokens(userId, companyId, googleTokens);
          oauth2Client.setCredentials(credentials);
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
          return null;
        }
      }

      return google.calendar({ version: 'v3', auth: oauth2Client });
    } catch (error) {
      console.error('Error creating Google Calendar client:', error);
      return null;
    }
  }

  /**
   * Check if a time slot is available before booking
   * Uses Google Calendar freebusy.query API to detect conflicts
   * 
   * NOTE: This method performs a non-atomic read-then-write check. In rare concurrent
   * scenarios, overlapping bookings can still occur because free/busy is checked before
   * event insertion. For stronger guarantees, consider implementing application-level
   * locking or reservation mechanisms (e.g., a database record keyed by calendar/time slot)
   * and enforce it in the flow before calling the calendar service.
   * 
   * @param userId The user ID
   * @param companyId The company ID
   * @param startDateTime ISO string of the event start time
   * @param endDateTime ISO string of the event end time
   * @param bufferMinutes Buffer time to add before/after the event (default 0)
   * @returns Object with available flag and optional conflicting events
   */
  private async checkTimeSlotAvailability(
    userId: number,
    companyId: number,
    startDateTime: string,
    endDateTime: string,
    bufferMinutes: number = 0
  ): Promise<{ available: boolean, conflictingEvents?: any[], error?: string }> {
    try {
      const calendar = await this.getCalendarClient(userId, companyId);

      if (!calendar) {
        return {
          available: true, // Fail-open: if we can't check, allow creation
          error: 'Calendar client not available for availability check'
        };
      }


      const startDate = new Date(startDateTime);
      const endDate = new Date(endDateTime);
      startDate.setMinutes(startDate.getMinutes() - bufferMinutes);
      endDate.setMinutes(endDate.getMinutes() + bufferMinutes);

      const timeMin = startDate.toISOString();
      const timeMax = endDate.toISOString();


      const busyTimeSlotsResponse = await this.withRetry(() =>
        calendar.freebusy.query({
          requestBody: {
            timeMin: timeMin,
            timeMax: timeMax,
            items: [{ id: 'primary' }],
          },
        })
      );

      const busySlots = busyTimeSlotsResponse.data.calendars?.primary?.busy || [];



      const effectiveRequestedStart = new Date(startDateTime);
      const effectiveRequestedEnd = new Date(endDateTime);
      effectiveRequestedStart.setMinutes(effectiveRequestedStart.getMinutes() - bufferMinutes);
      effectiveRequestedEnd.setMinutes(effectiveRequestedEnd.getMinutes() + bufferMinutes);

      const requestedStart = effectiveRequestedStart.getTime();
      const requestedEnd = effectiveRequestedEnd.getTime();

      const conflictingSlots = busySlots.filter((busySlot: any) => {
        const busyStart = new Date(busySlot.start).getTime();
        const busyEnd = new Date(busySlot.end).getTime();



        return (
          (requestedStart < busyEnd && requestedEnd > busyStart)
        );
      });

      if (conflictingSlots.length > 0) {
        return {
          available: false,
          conflictingEvents: conflictingSlots
        };
      }

      return { available: true };
    } catch (error: any) {
      console.error('Google Calendar Service: Error checking time slot availability:', {
        error: error.message,
        userId,
        companyId,
        startDateTime,
        endDateTime
      });

      return {
        available: true,
        error: error.message || 'Failed to check availability'
      };
    }
  }

  /**
   * Create a calendar event
   * Now includes conflict detection to prevent double bookings
   * 
   * NOTE: Conflict detection is non-atomic (read-then-write). Concurrent requests can still
   * result in overlapping bookings in rare scenarios. See checkTimeSlotAvailability() documentation
   * for details on implementing stronger guarantees.
   * 
   * @param userId The user ID
   * @param companyId The company ID
   * @param eventData Event data including start, end, summary, etc.
   * @param eventData.bufferMinutes Optional buffer minutes to respect when checking for conflicts
   * @returns Success status with event ID and link, or error message
   */
  public async createCalendarEvent(
    userId: number,
    companyId: number,
    eventData: any
  ): Promise<{ success: boolean, eventId?: string, error?: string, eventLink?: string }> {


    const {
      summary,
      description,
      location,
      start,
      end,
      attendees = [],
      send_updates = true,
      organizer_email,
      time_zone
    } = eventData;

    const startDateTime = start?.dateTime;
    const endDateTime = end?.dateTime;


    const eventTimeZone = time_zone || start?.timeZone || end?.timeZone || 'UTC';

    if (!startDateTime || !endDateTime) {
      console.error('Google Calendar Service: Missing start or end time');
      return { success: false, error: 'Start and end times are required' };
    }


    const bufferMinutes = eventData.bufferMinutes || 0;


    const availabilityCheck = await this.checkTimeSlotAvailability(
      userId,
      companyId,
      startDateTime,
      endDateTime,
      bufferMinutes
    );

    if (!availabilityCheck.available) {
      
      return {
        success: false,
        error: 'The requested time slot is not available. Please choose a different time.'
      };
    }


    if (availabilityCheck.error) {
      console.warn('Google Calendar Service: Availability check failed, proceeding with creation', {
        error: availabilityCheck.error,
        userId,
        companyId
      });
    }

    try {

      const calendar = await this.getCalendarClient(userId, companyId);

      if (!calendar) {
        console.error('Google Calendar Service: Calendar client not available');
        return { success: false, error: 'Google Calendar client not available' };
      }


      let processedAttendees: calendar_v3.Schema$EventAttendee[] | undefined;
      if (attendees && attendees.length > 0) {
        if (typeof attendees[0] === 'string') {
          processedAttendees = attendees.map((emailAddress: string) => ({ email: emailAddress }));
        } else {
          processedAttendees = attendees.map((attendee: any) => ({
            email: attendee.email,
            displayName: attendee.displayName || attendee.display_name
          }));
        }
      }

      const event: calendar_v3.Schema$Event = {
        summary,
        description,
        location,
        start: {
          dateTime: startDateTime,
          timeZone: eventTimeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: eventTimeZone,
        },
        attendees: processedAttendees,
        organizer: organizer_email ? { email: organizer_email } : undefined,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      };


      const sendUpdatesParam = send_updates ? 'all' : 'none';

      const response = await this.withRetry(() =>
        calendar.events.insert({
          calendarId: 'primary',
          requestBody: event,
          sendUpdates: sendUpdatesParam,
        })
      );



      if (response.status === 200 && response.data.id) {
        const result: {
          success: boolean;
          eventId?: string;
          eventLink?: string;
        } = {
          success: true,
          eventId: response.data.id
        };

        if (response.data.htmlLink) {
          result.eventLink = response.data.htmlLink;
        }


        return result;
      } else {
        console.error('Google Calendar Service: Unexpected response status:', response.status);
        return {
          success: false,
          error: `Failed to create event, status code: ${response.status}`
        };
      }
    } catch (error: any) {
      console.error('Google Calendar Service: Error creating calendar event:', {
        error: error.message,
        stack: error.stack,
        userId,
        companyId,
        eventData
      });
      return {
        success: false,
        error: error.message || 'Failed to create calendar event'
      };
    }
  }

  /**
   * List calendar events for a specific time range
   * @param userId The user ID
   * @param companyId The company ID
   * @param timeMin Start time for the range
   * @param timeMax End time for the range
   * @param maxResults Maximum number of events to return
   * @param requesterEmail Optional email of the requester to filter events for privacy
   */
  public async listCalendarEvents(
    userId: number,
    companyId: number,
    timeMin: string,
    timeMax: string,
    maxResults: number = 10,
    requesterEmail?: string
  ): Promise<any> {
    try {
      const calendar = await this.getCalendarClient(userId, companyId);

      if (!calendar) {
        return { success: false, error: 'Google Calendar client not available' };
      }


      let startTime: string;
      let endTime: string;

      if (!timeMin || !timeMax) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        startTime = timeMin ? (typeof timeMin === 'string' ? timeMin : new Date(timeMin).toISOString()) : thirtyDaysAgo.toISOString();
        endTime = timeMax ? (typeof timeMax === 'string' ? timeMax : new Date(timeMax).toISOString()) : thirtyDaysLater.toISOString();

        console.warn('Google Calendar listCalendarEvents: Defaulting list range to ±30 days due to missing timeMin/timeMax');
      } else {
        startTime = typeof timeMin === 'string' ? timeMin : new Date(timeMin).toISOString();
        endTime = typeof timeMax === 'string' ? timeMax : new Date(timeMax).toISOString();
      }





      const response = await this.withRetry(() =>
        calendar.events.list({
          calendarId: 'primary',
          timeMin: startTime,
          timeMax: endTime,
          maxResults: maxResults,
          singleEvents: true,
          orderBy: 'startTime'
        })
      );

      let items = response.data.items || [];



      if (items.length > 0) {

        items.forEach((event: any, index: number) => {
          console.log(`  Event ${index + 1}:`, {
            id: event.id,
            summary: event.summary,
            start: event.start?.dateTime || event.start?.date,
            organizer: event.organizer?.email,
            attendees: event.attendees?.map((a: any) => a.email) || []
          });
        });
      }


      if (requesterEmail) {
        const beforeFilterCount = items.length;
        items = items.filter((event: any) => {

          if (event.organizer?.email?.toLowerCase() === requesterEmail.toLowerCase()) {
            return true;
          }


          if (event.attendees && Array.isArray(event.attendees)) {
            const isAttendee = event.attendees.some((attendee: any) =>
              attendee.email?.toLowerCase() === requesterEmail.toLowerCase()
            );
            if (isAttendee) {
              return true;
            }
          }


          return false;
        });

      }

      return {
        success: true,
        items: items,
        nextPageToken: response.data.nextPageToken
      };
    } catch (error: any) {
      console.error('Error listing calendar events:', error);
      return {
        success: false,
        error: error.message || 'Failed to list calendar events',
        items: []
      };
    }
  }

  /**
   * Delete (cancel) a calendar event
   * @param userId The user ID
   * @param companyId The company ID
   * @param eventId The ID of the event to delete
   * @param sendUpdates Whether to send cancellation notifications to attendees
   */
  public async deleteCalendarEvent(
    userId: number,
    companyId: number,
    eventId: string,
    sendUpdates: boolean = true
  ): Promise<{ success: boolean, error?: string }> {
    try {
      const calendar = await this.getCalendarClient(userId, companyId);

      if (!calendar) {
        return { success: false, error: 'Google Calendar client not available' };
      }


      const sendUpdatesParam = sendUpdates ? 'all' : 'none';

      const response = await this.withRetry(() =>
        calendar.events.delete({
          calendarId: 'primary',
          eventId: eventId,
          sendUpdates: sendUpdatesParam
        })
      );

      if (response.status === 204 || response.status === 200) {
        return { success: true };
      } else {
        return {
          success: false,
          error: `Failed to delete event, status code: ${response.status}`
        };
      }
    } catch (error: any) {
      console.error('Error deleting calendar event:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete calendar event'
      };
    }
  }

  /**
   * Update an existing calendar event
   * @param userId The user ID
   * @param eventId The ID of the event to update
   * @param eventData The updated event data
   */
  public async updateCalendarEvent(
    userId: number,
    companyId: number,
    eventId: string,
    eventData: any
  ): Promise<{ success: boolean, error?: string, eventId?: string, eventLink?: string }> {
    try {
      const calendar = await this.getCalendarClient(userId, companyId);

      if (!calendar) {
        return { success: false, error: 'Google Calendar client not available' };
      }


      const { send_updates = true, time_zone, attendees, ...restEventData } = eventData;


      let processedAttendees: calendar_v3.Schema$EventAttendee[] | undefined;
      if (attendees && attendees.length > 0) {
        if (typeof attendees[0] === 'string') {
          processedAttendees = attendees.map((emailAddress: string) => ({ email: emailAddress }));
        } else {
          processedAttendees = attendees.map((attendee: any) => ({
            email: attendee.email,
            displayName: attendee.displayName || attendee.display_name
          }));
        }
      }


      const updatedEventData = { ...restEventData };
      if (time_zone) {
        if (updatedEventData.start) {
          updatedEventData.start.timeZone = time_zone;
        }
        if (updatedEventData.end) {
          updatedEventData.end.timeZone = time_zone;
        }
      }

      if (processedAttendees) {
        updatedEventData.attendees = processedAttendees;
      }


      const sendUpdatesParam = send_updates ? 'all' : 'none';

      const response = await this.withRetry(() =>
        calendar.events.update({
          calendarId: 'primary',
          eventId: eventId,
          requestBody: updatedEventData,
          sendUpdates: sendUpdatesParam
        })
      );

      if (response.status === 200) {
        const result: {
          success: boolean,
          eventId?: string,
          eventLink?: string
        } = {
          success: true,
          eventId: response.data.id as string | undefined
        };

        if (response.data.htmlLink) {
          result.eventLink = response.data.htmlLink;
        }

        return result;
      } else {
        return {
          success: false,
          error: `Failed to update event, status code: ${response.status}`
        };
      }
    } catch (error: any) {
      console.error('Error updating calendar event:', error);
      return {
        success: false,
        error: error.message || 'Failed to update calendar event'
      };
    }
  }

  /**
   * Helper function to convert local date/time to UTC
   * @param date Date string in YYYY-MM-DD format
   * @param time Time string in HH:MM format (24-hour)
   * @param timeZone IANA timezone identifier
   * @returns Date object in UTC
   */
  private convertLocalToUTC(date: string, time: string, timeZone: string): Date {
    try {

      const [year, month, day] = date.split('-').map(Number);
      const [hour, minute] = time.split(':').map(Number);








      let utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));


      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });


      const parts = formatter.formatToParts(utcGuess);
      const partsMap = parts.reduce((acc, part) => {
        if (part.type !== 'literal') acc[part.type] = part.value;
        return acc;
      }, {} as Record<string, string>);

      const localYear = parseInt(partsMap.year || '0');
      const localMonth = parseInt(partsMap.month || '0');
      const localDay = parseInt(partsMap.day || '0');
      const localHour = parseInt(partsMap.hour || '0');
      const localMinute = parseInt(partsMap.minute || '0');




      const wantedMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
      const gotMs = Date.UTC(localYear, localMonth - 1, localDay, localHour, localMinute, 0, 0);
      const offsetMs = wantedMs - gotMs;


      const result = new Date(utcGuess.getTime() + offsetMs);


      const verifyParts = formatter.formatToParts(result);
      const verifyMap = verifyParts.reduce((acc, part) => {
        if (part.type !== 'literal') acc[part.type] = part.value;
        return acc;
      }, {} as Record<string, string>);

      const verifyHour = parseInt(verifyMap.hour || '0');
      const verifyMinute = parseInt(verifyMap.minute || '0');


      if (verifyHour === hour && verifyMinute === minute) {
        return result;
      }


      console.warn(`[convertLocalToUTC] Verification mismatch: wanted ${hour}:${minute}, got ${verifyHour}:${verifyMinute}`);
      return result;

    } catch (error) {
      console.error('[convertLocalToUTC] Error converting timezone:', error);

      return new Date(`${date}T${time}:00Z`);
    }
  }

  /**
   * Find appointment by date and time
   * Useful for finding an appointment to cancel or update
   * @param userId The user ID
   * @param companyId The company ID
   * @param date The date of the appointment (YYYY-MM-DD)
   * @param time The time of the appointment (HH:MM in 24-hour format)
   * @param email Optional email of the requester to filter events for privacy
   * @param timeZone Optional timezone (defaults to UTC)
   */
  public async findAppointmentByDateTime(
    userId: number,
    companyId: number,
    date: string,
    time: string,
    email?: string,
    timeZone: string = 'UTC'
  ): Promise<{ success: boolean, eventId?: string, error?: string }> {
    try {



      const appointmentDateTime = this.convertLocalToUTC(date, time, timeZone);




      const timeMin = new Date(appointmentDateTime.getTime() - 30 * 60000).toISOString();
      const timeMax = new Date(appointmentDateTime.getTime() + 30 * 60000).toISOString();




      const events = await this.listCalendarEvents(userId, companyId, timeMin, timeMax, 10, email);

      if (!events.success) {

        return { success: false, error: events.error };
      }



      if (events.items.length === 0) {


        const [year, month, day] = date.split('-').map(Number);

        if (month !== day && month <= 12 && day <= 12) {

          const alternateDate = `${year}-${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`;


          const alternateDateTime = this.convertLocalToUTC(alternateDate, time, timeZone);
          const altTimeMin = new Date(alternateDateTime.getTime() - 30 * 60000).toISOString();
          const altTimeMax = new Date(alternateDateTime.getTime() + 30 * 60000).toISOString();



          const altEvents = await this.listCalendarEvents(userId, companyId, altTimeMin, altTimeMax, 10, email);

          if (altEvents.success && altEvents.items.length > 0) {




            altEvents.items.forEach((event: any, index: number) => {
              console.log(`  Event ${index + 1}:`, {
                id: event.id,
                summary: event.summary,
                start: event.start?.dateTime || event.start?.date,
                organizer: event.organizer?.email,
                attendees: event.attendees?.map((a: any) => a.email) || []
              });
            });


            if (email) {
              const emailLower = email.toLowerCase();
              for (const event of altEvents.items) {
                if (event.organizer?.email?.toLowerCase() === emailLower) {

                  return { success: true, eventId: event.id };
                }
                if (event.attendees && event.attendees.some((attendee: any) =>
                  attendee.email?.toLowerCase() === emailLower)) {

                  return { success: true, eventId: event.id };
                }
              }

            } else {

              return { success: true, eventId: altEvents.items[0].id };
            }
          }
        }

        return { success: false, error: 'No appointment found at specified date and time' };
      }



      events.items.forEach((event: any, index: number) => {
        console.log(`  Event ${index + 1}:`, {
          id: event.id,
          summary: event.summary,
          start: event.start?.dateTime || event.start?.date,
          organizer: event.organizer?.email,
          attendees: event.attendees?.map((a: any) => a.email) || []
        });
      });


      if (email) {
        const emailLower = email.toLowerCase();


        for (const event of events.items) {

          if (event.organizer?.email?.toLowerCase() === emailLower) {

            return { success: true, eventId: event.id };
          }

          if (event.attendees && event.attendees.some((attendee: any) =>
            attendee.email?.toLowerCase() === emailLower)) {

            return { success: true, eventId: event.id };
          }
        }


        return { success: false, error: `No appointment found for ${email} at specified date and time` };
      }



      return { success: true, eventId: events.items[0].id };

    } catch (error: any) {
      console.error('[findAppointmentByDateTime] Error finding appointment:', error);
      return {
        success: false,
        error: error.message || 'Failed to find appointment'
      };
    }
  }

  /**
   * Check the connection status of the Google Calendar integration
   */
  public async checkCalendarConnectionStatus(
    userId: number,
    companyId: number
  ): Promise<{ connected: boolean, message: string }> {
    try {
      const tokens = await storage.getGoogleTokens(userId, companyId);

      if (!tokens) {
        return {
          connected: false,
          message: 'Not connected to Google Calendar'
        };
      }

      const calendar = await this.getCalendarClient(userId, companyId);
      if (!calendar) {
        return {
          connected: false,
          message: 'Connection to Google Calendar failed'
        };
      }

      return {
        connected: true,
        message: 'Connected to Google Calendar'
      };
    } catch (error) {
      console.error('Error checking calendar connection:', error);
      return {
        connected: false,
        message: 'Error checking Google Calendar connection'
      };
    }
  }

  /**
   * Get available time slots from a user's calendar
   * Enhanced to work with both single date and date range
   * @param userId User ID
   * @param companyId Company ID
   * @param date Single date to check (YYYY-MM-DD)
   * @param durationMinutes Duration of each slot in minutes (also used as slot step)
   * @param startDate Start date for range (YYYY-MM-DD)
   * @param endDate End date for range (YYYY-MM-DD)
   * @param businessHoursStart Business hours start (hour, 0-23)
   * @param businessHoursEnd Business hours end (hour, 0-23)
   * @param timeZone Timezone for slot generation (e.g., 'Pakistan/Islamabad')
   * @param bufferMinutes Buffer time to add before/after busy slots
   */
  public async getAvailableTimeSlots(
    userId: number,
    companyId: number,
    date?: string,
    durationMinutes: number = 60,
    startDate?: string,
    endDate?: string,
    businessHoursStart: number = 9,
    businessHoursEnd: number = 18,
    timeZone: string = 'UTC',
    bufferMinutes: number = 0
  ): Promise<{
    success: boolean,
    timeSlots?: Array<{
      date: string,
      slots: string[]
    }>,
    error?: string
  }> {


    try {

      const calendar = await this.getCalendarClient(userId, companyId);

      if (!calendar) {
        console.error('Google Calendar Service: Calendar client not available for availability check');
        return { success: false, error: 'Google Calendar client not available' };
      }



      let startDateTime: string;
      let endDateTime: string;
      let dateArray: string[] = [];

      if (date) {
        startDateTime = new Date(`${date}T00:00:00Z`).toISOString();
        endDateTime = new Date(`${date}T23:59:59Z`).toISOString();
        dateArray = [date];
      } else if (startDate && endDate) {
        startDateTime = new Date(`${startDate}T00:00:00Z`).toISOString();
        endDateTime = new Date(`${endDate}T23:59:59Z`).toISOString();

        dateArray = this.generateDateRange(startDate, endDate);
      } else {
        const today = new Date();
        const formattedToday = today.toISOString().split('T')[0];
        startDateTime = new Date(`${formattedToday}T00:00:00Z`).toISOString();
        endDateTime = new Date(`${formattedToday}T23:59:59Z`).toISOString();
        dateArray = [formattedToday];
      }

      

      const busyTimeSlotsResponse = await this.withRetry(() =>
        calendar.freebusy.query({
          requestBody: {
            timeMin: startDateTime,
            timeMax: endDateTime,
            items: [{ id: 'primary' }],
          },
        })
      );

      const busySlots = busyTimeSlotsResponse.data.calendars?.primary?.busy || [];


      const bufferedBusySlots = busySlots.map((busySlot: any) => {
        const busyStart = new Date(busySlot.start);
        const busyEnd = new Date(busySlot.end);


        busyStart.setMinutes(busyStart.getMinutes() - bufferMinutes);
        busyEnd.setMinutes(busyEnd.getMinutes() + bufferMinutes);

        return {
          start: busyStart.toISOString(),
          end: busyEnd.toISOString()
        };
      });

      const allAvailableSlots: Array<{date: string, slots: string[]}> = [];

      for (const currentDate of dateArray) {
        const availableSlots: string[] = [];
        const dateObj = new Date(`${currentDate}T00:00:00Z`);

        dateObj.setHours(businessHoursStart, 0, 0, 0);


        while (dateObj.getHours() < businessHoursEnd) {
          const slotStart = new Date(dateObj);
          const slotEnd = new Date(dateObj);
          slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

          if (slotEnd.getHours() > businessHoursEnd ||
              (slotEnd.getHours() === businessHoursEnd && slotEnd.getMinutes() > 0)) {
            break;
          }


          const isSlotAvailable = !bufferedBusySlots.some((busySlot: any) => {
            const busyStart = new Date(busySlot.start);
            const busyEnd = new Date(busySlot.end);

            return (
              (slotStart >= busyStart && slotStart < busyEnd) ||
              (slotEnd > busyStart && slotEnd <= busyEnd) ||
              (slotStart <= busyStart && slotEnd >= busyEnd)
            );
          });

          if (isSlotAvailable) {

            const formattedStart = slotStart.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
              timeZone: timeZone
            });
            availableSlots.push(formattedStart);
          }


          dateObj.setMinutes(dateObj.getMinutes() + durationMinutes);
        }

        allAvailableSlots.push({
          date: currentDate,
          slots: availableSlots
        });
      }

      return {
        success: true,
        timeSlots: allAvailableSlots
      };
    } catch (error: any) {
      console.error('Error getting available time slots:', error);
      return {
        success: false,
        error: error.message || 'Failed to get available time slots'
      };
    }
  }

  /**
   * Generate an array of dates between start and end dates (inclusive)
   */
  private generateDateRange(startDate: string, endDate: string): string[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateArray: string[] = [];

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const current = new Date(start);
    while (current <= end) {
      dateArray.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dateArray;
  }
}

const googleCalendarService = new GoogleCalendarService();
export default googleCalendarService;