import axios from 'axios';
import config from '../config/env.js';
import logger from '../utils/logger.js';

class WhatsappService {
  constructor() {
    this.apiUrl = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`;
  }

  /**
   * Helper to build axios request configuration.
   */
  _getRequestConfig() {
    return {
      headers: {
        'Authorization': `Bearer ${config.whatsapp.accessToken}`,
        'Content-Type': 'application/json'
      }
    };
  }

  /**
   * Send a standard text message.
   * @param {string} to - Recipient phone number (with country code, e.g. "919876543210")
   * @param {string} body - The message content
   */
  async sendTextMessage(to, body) {
    if (config.whatsapp.isPlaceholder) {
      logger.warn(`Simulating WhatsApp Send Text to ${to} (running in placeholder mode): "${body}"`);
      return { success: true, simulated: true, to, body };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'text',
      text: {
        preview_url: false,
        body: body
      }
    };

    try {
      logger.info(`Sending WhatsApp text message to ${to}`);
      const response = await axios.post(this.apiUrl, payload, this._getRequestConfig());
      logger.info(`WhatsApp message sent successfully to ${to}`, { messageId: response.data.messages?.[0]?.id });
      return { success: true, messageId: response.data.messages?.[0]?.id, data: response.data };
    } catch (error) {
      const apiError = error.response ? error.response.data : error.message;
      logger.error(`Failed to send WhatsApp message to ${to}`, error, { apiError });
      throw new Error(`WhatsApp API Error: ${JSON.stringify(apiError)}`);
    }
  }

  /**
   * Send a template message (required for starting conversations).
   * @param {string} to - Recipient phone number
   * @param {string} templateName - Name of the template pre-approved in Meta Console
   * @param {string} languageCode - Language code (e.g. "en_US")
   * @param {Array} parameters - Dynamic text parameters for the template body (e.g. [{type: "text", text: "Customer Name"}] )
   */
  async sendTemplateMessage(to, templateName, languageCode = 'en_US', parameters = []) {
    if (config.whatsapp.isPlaceholder) {
      logger.warn(`Simulating WhatsApp Send Template [${templateName}] to ${to} (placeholder mode) with params:`, parameters);
      return { success: true, simulated: true, to, templateName, parameters };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        }
      }
    };

    if (parameters.length > 0) {
      payload.template.components = [
        {
          type: 'body',
          parameters: parameters
        }
      ];
    }

    try {
      logger.info(`Sending WhatsApp template [${templateName}] to ${to}`);
      const response = await axios.post(this.apiUrl, payload, this._getRequestConfig());
      logger.info(`WhatsApp template sent successfully to ${to}`, { messageId: response.data.messages?.[0]?.id });
      return { success: true, messageId: response.data.messages?.[0]?.id, data: response.data };
    } catch (error) {
      const apiError = error.response ? error.response.data : error.message;
      logger.error(`Failed to send WhatsApp template message to ${to}`, error, { apiError });
      throw new Error(`WhatsApp API Error: ${JSON.stringify(apiError)}`);
    }
  }
}

export default new WhatsappService();
