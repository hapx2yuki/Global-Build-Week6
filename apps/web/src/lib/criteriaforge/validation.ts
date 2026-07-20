import Ajv2020, { type ErrorObject } from "ajv/dist/2020"
import addFormats from "ajv-formats"
import type { TSchema } from "@sinclair/typebox"

const ajv = addFormats(
  new Ajv2020({
    allErrors: true,
    strict: true,
    validateFormats: true,
  })
)

export type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; errors: ErrorObject[] }

export function validateSchema<T>(
  schema: TSchema,
  value: unknown
): ValidationResult<T> {
  const validate = ajv.compile<T>(schema)
  if (validate(value)) {
    return { success: true, value }
  }
  return { success: false, errors: validate.errors ?? [] }
}

export function assertSchema<T>(schema: TSchema, value: unknown): T {
  const result = validateSchema<T>(schema, value)
  if (result.success) return result.value
  const details = result.errors
    .map((error) => `${error.instancePath || "/"} ${error.message}`)
    .join("; ")
  throw new Error(`Schema validation failed: ${details}`)
}
