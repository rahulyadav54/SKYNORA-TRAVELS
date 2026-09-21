/**
 * Convert travel tool definitions to Google Gemini function declarations.
 */

import { FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { TRAVEL_TOOLS } from "./tools";

type JsonSchema = {
  type?: string;
  description?: string;
  enum?: string[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
};

function toGeminiSchema(schema: JsonSchema): Record<string, unknown> {
  const type = schema.type ?? "object";

  if (type === "string") {
    const out: Record<string, unknown> = {
      type: SchemaType.STRING,
      description: schema.description,
    };
    if (schema.enum) out.enum = schema.enum;
    return out;
  }
  if (type === "number" || type === "integer") {
    return { type: SchemaType.NUMBER, description: schema.description };
  }
  if (type === "boolean") {
    return { type: SchemaType.BOOLEAN, description: schema.description };
  }
  if (type === "array") {
    return {
      type: SchemaType.ARRAY,
      description: schema.description,
      items: schema.items ? toGeminiSchema(schema.items) : { type: SchemaType.STRING },
    };
  }

  const properties: Record<string, unknown> = {};
  if (schema.properties) {
    for (const [key, val] of Object.entries(schema.properties)) {
      properties[key] = toGeminiSchema(val);
    }
  }

  return {
    type: SchemaType.OBJECT,
    description: schema.description,
    properties,
    required: schema.required ?? [],
  };
}

export const GEMINI_TRAVEL_TOOLS: FunctionDeclaration[] = TRAVEL_TOOLS.map((tool) => ({
  name: tool.name,
  description: tool.description ?? "",
  parameters: toGeminiSchema(tool.input_schema as JsonSchema) as unknown as FunctionDeclaration["parameters"],
}));
