/**
 * WebSocket utility functions for broadcasting events
 * This module provides a safe way to emit WebSocket events from any service
 */

export interface WebSocketEvent {
  type: string;
  data: any;
}

/**
 * Broadcast an event to all clients in a specific company
 * @param event - The event to broadcast
 * @param companyId - The company ID to broadcast to
 */
export function broadcastToCompany(event: WebSocketEvent, companyId: number): void {
  try {
    if ((global as any).broadcastToCompany) {
      (global as any).broadcastToCompany(event, companyId);
    } else {
      
    }
  } catch (error) {
    console.error('Failed to broadcast WebSocket event:', error);
  }
}

/**
 * Broadcast an event to all connected clients
 * @param event - The event to broadcast
 */
export function broadcastToAll(event: WebSocketEvent): void {
  try {
    if ((global as any).broadcastToAllClients) {
      (global as any).broadcastToAllClients(event);
    } else {
      
    }
  } catch (error) {
    console.error('Failed to broadcast WebSocket event:', error);
  }
}

/**
 * Check if WebSocket broadcasting is available
 * @returns true if WebSocket functions are available
 */
export function isWebSocketAvailable(): boolean {
  return !!(global as any).broadcastToCompany && !!(global as any).broadcastToAllClients;
}

/**
 * Broadcast an event to a specific WebChat widget session
 * @param event - The event to broadcast
 * @param sessionId - The visitor session ID
 */
export function broadcastToWebChatSession(event: WebSocketEvent, sessionId: string): void {
  try {
    if ((global as any).broadcastToWebChatWidget) {
      (global as any).broadcastToWebChatWidget(event, sessionId);
    } else {
      
    }
  } catch (error) {
    console.error('Error broadcasting to WebChat widget:', error);
  }
}

/**
 * Campaign-specific event broadcasting
 */
export class CampaignEventEmitter {
  /**
   * Emit a campaign status update event
   * @param campaignId - The campaign ID
   * @param companyId - The company ID
   * @param eventType - The type of event
   * @param data - Additional event data
   */
  static emitCampaignEvent(
    campaignId: number, 
    companyId: number, 
    eventType: string, 
    data: any
  ): void {
    const event: WebSocketEvent = {
      type: 'campaignStatusUpdate',
      data: {
        eventType,
        campaignId,
        ...data
      }
    };

    broadcastToCompany(event, companyId);
    
  }

  /**
   * Emit a message sent event
   * @param campaignId - The campaign ID
   * @param companyId - The company ID
   * @param progress - Progress data
   * @param additionalData - Additional event data
   */
  static emitMessageSent(
    campaignId: number,
    companyId: number,
    progress: any,
    additionalData: any = {}
  ): void {
    this.emitCampaignEvent(campaignId, companyId, 'message_sent', {
      progress,
      ...additionalData
    });
  }

  /**
   * Emit a message failed event
   * @param campaignId - The campaign ID
   * @param companyId - The company ID
   * @param progress - Progress data
   * @param errorMessage - Error message
   * @param additionalData - Additional event data
   */
  static emitMessageFailed(
    campaignId: number,
    companyId: number,
    progress: any,
    errorMessage: string,
    additionalData: any = {}
  ): void {
    this.emitCampaignEvent(campaignId, companyId, 'message_failed', {
      progress,
      errorMessage,
      failedAt: new Date(),
      ...additionalData
    });
  }

  /**
   * Emit a campaign completed event
   * @param campaignId - The campaign ID
   * @param companyId - The company ID
   * @param campaignName - The campaign name
   * @param stats - Final campaign statistics
   */
  static emitCampaignCompleted(
    campaignId: number,
    companyId: number,
    campaignName: string,
    stats: any
  ): void {
    this.emitCampaignEvent(campaignId, companyId, 'campaign_completed', {
      campaignName,
      completedAt: new Date(),
      ...stats
    });
  }
}
