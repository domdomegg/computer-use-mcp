import {z, type ZodRawShape} from 'zod';

type AliasMap = Record<string, string>;

/**
 * Creates a strict Zod object schema that:
 * 1. Accepts aliased parameter names (e.g., new_string -> new_str)
 * 2. Rejects any unknown parameters after alias resolution
 */
export function strictSchemaWithAliases<T extends ZodRawShape>(
	shape: T,
	aliases: AliasMap = {},
): z.ZodType {
	const objectSchema = z.object(shape).strict();

	return z.preprocess((args: unknown) => {
		if (typeof args !== 'object' || args === null) {
			return args;
		}

		const input = args as Record<string, unknown>;
		const result: Record<string, unknown> = {};

		// Build result object, mapping aliases to canonical names
		for (const key of Object.keys(input)) {
			const canonicalKey = aliases[key] ?? key;
			// Only use alias if canonical key isn't already set
			if (!(canonicalKey in result)) {
				result[canonicalKey] = input[key];
			}
		}

		return result;
	}, objectSchema);
}
