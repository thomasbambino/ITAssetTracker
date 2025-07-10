import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SmartSearchQuery {
  intent: 'devices' | 'users' | 'software' | 'maintenance' | 'general';
  filters: {
    category?: string;
    department?: string;
    assignedTo?: string;
    status?: string;
    dateRange?: {
      start?: string;
      end?: string;
    };
    brand?: string;
    model?: string;
    expiryPeriod?: string;
  };
  sortBy?: string;
  confidence: number;
}

export interface ProblemAnalysis {
  category: 'hardware' | 'software' | 'network' | 'access' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  suggestedAssignee: string;
  tags: string[];
  confidence: number;
  reasoning: string;
}

export class AIService {
  /**
   * Parse natural language search queries into structured filters
   */
  static async parseSearchQuery(query: string): Promise<SmartSearchQuery> {
    try {
      const prompt = `You are an IT asset management search assistant. Parse this natural language query into structured search parameters.

Query: "${query}"

Available categories: Laptops, Desktops, Monitors, Phones, Tablets, Printers, Accessories, Servers, Network Equipment, Apple
Available departments: IT, Sales, Marketing, Support, Accounting, Management, Shipping, Billing
Available statuses: Active, Inactive, Maintenance, Retired

Return a JSON object with this structure:
{
  "intent": "devices|users|software|maintenance|general",
  "filters": {
    "category": "category name if mentioned",
    "department": "department name if mentioned", 
    "assignedTo": "user name if mentioned",
    "status": "status if mentioned",
    "dateRange": {
      "start": "ISO date if mentioned",
      "end": "ISO date if mentioned"
    },
    "brand": "brand name if mentioned",
    "model": "model name if mentioned",
    "expiryPeriod": "next week|next month|next quarter|expired if mentioned"
  },
  "sortBy": "field to sort by if mentioned",
  "confidence": 0.0-1.0
}

Examples:
"Show me all laptops assigned to sales" -> {"intent": "devices", "filters": {"category": "Laptops", "department": "Sales"}, "confidence": 0.95}
"Find expired warranties" -> {"intent": "devices", "filters": {"expiryPeriod": "expired"}, "confidence": 0.9}
"Apple devices in IT" -> {"intent": "devices", "filters": {"brand": "Apple", "department": "IT"}, "confidence": 0.95}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a search query parser. Respond only with valid JSON in the specified format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        intent: result.intent || 'general',
        filters: result.filters || {},
        sortBy: result.sortBy,
        confidence: result.confidence || 0.5
      };
    } catch (error) {
      console.error('AI search parsing error:', error);
      return {
        intent: 'general',
        filters: {},
        confidence: 0.0
      };
    }
  }

  /**
   * Analyze problem reports for categorization and priority
   */
  static async analyzeProblemReport(
    title: string, 
    description: string, 
    deviceType?: string,
    softwareName?: string
  ): Promise<ProblemAnalysis> {
    try {
      const prompt = `Analyze this IT support problem report and provide categorization, priority, and routing suggestions.

Title: "${title}"
Description: "${description}"
${deviceType ? `Device Type: ${deviceType}` : ''}
${softwareName ? `Software: ${softwareName}` : ''}

Categories: hardware, software, network, access, general
Priorities: low, medium, high, urgent
Suggested Assignees: IT Support, Network Team, Security Team, Hardware Team, Software Team

Consider these priority guidelines:
- Urgent: System down, security breach, complete work stoppage
- High: Major functionality lost, multiple users affected, data at risk
- Medium: Single user issues, workarounds available, non-critical features
- Low: Enhancement requests, minor cosmetic issues, training requests

Return JSON:
{
  "category": "hardware|software|network|access|general",
  "priority": "low|medium|high|urgent", 
  "suggestedAssignee": "team name",
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of analysis"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system", 
            content: "You are an IT support triage specialist. Respond only with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        category: result.category || 'general',
        priority: result.priority || 'medium',
        suggestedAssignee: result.suggestedAssignee || 'IT Support',
        tags: result.tags || [],
        confidence: result.confidence || 0.5,
        reasoning: result.reasoning || 'Standard analysis'
      };
    } catch (error) {
      console.error('AI problem analysis error:', error);
      return {
        category: 'general',
        priority: 'medium',
        suggestedAssignee: 'IT Support',
        tags: [],
        confidence: 0.0,
        reasoning: 'Fallback analysis'
      };
    }
  }

  /**
   * Generate search suggestions based on user input
   */
  static async generateSearchSuggestions(partialQuery: string): Promise<string[]> {
    try {
      const prompt = `Generate helpful search suggestions for an IT asset management system based on this partial input: "${partialQuery}"

Common search patterns:
- "Show me all [category] assigned to [department]"
- "Find [brand] devices with expired warranties"
- "List [status] devices in [location]"
- "Show software expiring next month"
- "Find unassigned [category]"

Generate 3-5 relevant, actionable search suggestions that complete or enhance the user's query.
Return as JSON array of strings.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 200
      });

      const result = JSON.parse(response.choices[0].message.content || '{"suggestions":[]}');
      return result.suggestions || [];
    } catch (error) {
      console.error('AI suggestions error:', error);
      return [];
    }
  }
}