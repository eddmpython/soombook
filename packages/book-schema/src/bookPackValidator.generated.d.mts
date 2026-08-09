import type { ErrorObject } from 'ajv';

import type { BookPack } from './bookPack';

interface BookPackStructureValidator {
  (value: unknown): value is BookPack;
  errors?: ErrorObject[] | null;
}

declare const validateBookPackStructure: BookPackStructureValidator;

export default validateBookPackStructure;
