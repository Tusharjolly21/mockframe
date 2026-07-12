import { SCHEMA_VERSION, SceneDocumentSchema, type SceneDocument } from "./schema";

/**
 * Pure migration functions keyed by the version they migrate FROM.
 * Never mutate old saved scenes in place; migrate on read.
 *
 * v1/v2 predate the public release; their migrations exist to exercise the
 * mechanism and as the pattern for future versions.
 */
type UnknownScene = Record<string, unknown> & { schemaVersion?: number };

const migrations: Record<number, (scene: UnknownScene) => UnknownScene> = {
  1: (scene) => ({ ...scene, schemaVersion: 2 }),
  2: (scene) => ({ ...scene, schemaVersion: 3 }),
};

export class SceneValidationError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super(`Invalid scene document: ${issues.join("; ")}`);
    this.name = "SceneValidationError";
    this.issues = issues;
  }
}

/** Migrate (if needed) and validate a scene document read from any trust boundary. */
export function migrateScene(input: unknown): SceneDocument {
  let doc = input as UnknownScene;
  if (typeof doc !== "object" || doc === null) {
    throw new SceneValidationError(["document is not an object"]);
  }
  let version = typeof doc.schemaVersion === "number" ? doc.schemaVersion : 0;
  if (version < 1 || version > SCHEMA_VERSION) {
    throw new SceneValidationError([`unsupported schemaVersion ${version}`]);
  }
  while (version < SCHEMA_VERSION) {
    const step = migrations[version];
    if (!step) throw new SceneValidationError([`missing migration from v${version}`]);
    doc = step(doc);
    version = doc.schemaVersion as number;
  }
  const parsed = SceneDocumentSchema.safeParse(doc);
  if (!parsed.success) {
    throw new SceneValidationError(
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
    );
  }
  return parsed.data;
}
