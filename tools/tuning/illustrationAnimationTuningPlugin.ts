import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizePath, type Plugin } from "vite";
import * as ts from "typescript";

type AnimationSetting =
  | {
      variant: "instant";
    }
  | {
      animationLengthPercent: number;
      endPercent: number;
      startPercent: number;
      variant: "range";
    };

type IllustrationVisibility = "adjacent" | "only-active";
type TextIllustrationKind = "kinetic-warp" | "word-cloud";

type AnimationChange = {
  hasIllustrationAnimation: boolean;
  hasIllustrationKind: boolean;
  hasIllustrationVisibility: boolean;
  illustrationAnimation: AnimationSetting | null;
  illustrationKind?: TextIllustrationKind;
  illustrationVisibility?: IllustrationVisibility;
  sectionId: number;
  timestamp?: string;
};

type TextEdit = {
  end: number;
  start: number;
  text: string;
};

const TUNING_ENDPOINT = "/__dong-liu/illustration-animation-settings";
const LYRICS_FILE = resolve("src/lyrics/ram-box-lyrics.ts");
const NORMALIZED_LYRICS_FILE = normalizePath(LYRICS_FILE);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseAnimation(value: unknown): AnimationSetting | null {
  if (value === null) return null;
  if (!isRecord(value) || typeof value.variant !== "string") throw new Error("Invalid animation setting");
  if (value.variant === "instant") return { variant: "instant" };
  if (value.variant !== "range") throw new Error("Invalid animation variant");

  const startPercent = Number(value.startPercent);
  const endPercent = Number(value.endPercent);
  const animationLengthPercent = value.animationLengthPercent === undefined ? 100 : Number(value.animationLengthPercent);
  if (!Number.isFinite(startPercent) || startPercent < 0 || startPercent > 50) {
    throw new Error("startPercent must be 0-50");
  }
  if (!Number.isFinite(endPercent) || endPercent < 51 || endPercent > 100) {
    throw new Error("endPercent must be 51-100");
  }
  if (!Number.isFinite(animationLengthPercent) || animationLengthPercent < 0 || animationLengthPercent > 100) {
    throw new Error("animationLengthPercent must be 0-100");
  }

  return { animationLengthPercent, endPercent, startPercent, variant: "range" };
}

function parseIllustrationVisibility(value: unknown): IllustrationVisibility {
  if (value === "adjacent" || value === "only-active") return value;

  throw new Error("Invalid illustration visibility");
}

function parseIllustrationKind(value: unknown): TextIllustrationKind {
  if (value === "kinetic-warp" || value === "word-cloud") return value;

  throw new Error("Invalid illustration kind");
}

function parseTimestamp(value: unknown) {
  if (typeof value !== "string") throw new Error("timestamp must be a string");

  const [minutes, seconds] = value.split(":").map(Number);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
    throw new Error("Invalid timestamp");
  }

  return value;
}

function parseChanges(value: unknown): AnimationChange[] {
  if (!isRecord(value) || !Array.isArray(value.changes)) throw new Error("Expected changes array");

  return value.changes.map((entry) => {
    if (!isRecord(entry)) throw new Error("Invalid change");

    const sectionId = Number(entry.sectionId);
    if (!Number.isInteger(sectionId) || sectionId <= 0) throw new Error("Invalid sectionId");

    const hasIllustrationAnimation = Object.hasOwn(entry, "illustrationAnimation");
    const hasIllustrationKind = Object.hasOwn(entry, "illustrationKind");
    const hasIllustrationVisibility = Object.hasOwn(entry, "illustrationVisibility");
    const hasTimestamp = Object.hasOwn(entry, "timestamp");
    if (!hasIllustrationAnimation && !hasIllustrationKind && !hasIllustrationVisibility && !hasTimestamp) {
      throw new Error("Change must include a tuning value");
    }

    return {
      hasIllustrationAnimation,
      hasIllustrationKind,
      hasIllustrationVisibility,
      illustrationAnimation: hasIllustrationAnimation ? parseAnimation(entry.illustrationAnimation) : null,
      illustrationKind: hasIllustrationKind ? parseIllustrationKind(entry.illustrationKind) : undefined,
      illustrationVisibility: hasIllustrationVisibility
        ? parseIllustrationVisibility(entry.illustrationVisibility)
        : undefined,
      sectionId,
      timestamp: hasTimestamp ? parseTimestamp(entry.timestamp) : undefined,
    };
  });
}

function getPropertyName(property: ts.ObjectLiteralElementLike) {
  if (!ts.isPropertyAssignment(property)) return null;
  const name = property.name;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;

  return null;
}

function findLyricsArray(sourceFile: ts.SourceFile) {
  let lyricsArray: ts.ArrayLiteralExpression | undefined;

  const visit = (node: ts.Node) => {
    if (lyricsArray) return;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "RAM_BOX_LYRICS" &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      lyricsArray = node.initializer;
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  const foundLyricsArray = lyricsArray;
  if (!foundLyricsArray) throw new Error("RAM_BOX_LYRICS array not found");

  return foundLyricsArray;
}

function getSectionId(sectionObject: ts.ObjectLiteralExpression) {
  const property = sectionObject.properties.find((candidate) => getPropertyName(candidate) === "sectionId");
  if (!property || !ts.isPropertyAssignment(property) || !ts.isNumericLiteral(property.initializer)) return null;

  return Number(property.initializer.text);
}

function getLineStart(text: string, position: number) {
  return text.lastIndexOf("\n", position - 1) + 1;
}

function getLineEndIncludingNewline(text: string, position: number) {
  const newlineIndex = text.indexOf("\n", position);

  return newlineIndex === -1 ? text.length : newlineIndex + 1;
}

function getEndIncludingComma(text: string, position: number) {
  let cursor = position;
  while (/\s/.test(text[cursor] ?? "")) cursor += 1;

  return text[cursor] === "," ? cursor + 1 : position;
}

function getLineIndent(text: string, position: number) {
  const lineStart = getLineStart(text, position);
  const match = /^\s*/.exec(text.slice(lineStart, position));

  return match?.[0] ?? "";
}

function formatAnimation(animation: AnimationSetting) {
  if (animation.variant === "instant") return '{ variant: "instant" }';

  return `{ variant: "range", startPercent: ${animation.startPercent}, endPercent: ${animation.endPercent}, animationLengthPercent: ${animation.animationLengthPercent} }`;
}

function updateStringProperty(
  sourceFile: ts.SourceFile,
  text: string,
  sectionObject: ts.ObjectLiteralExpression,
  sectionId: number,
  propertyName: string,
  value: string,
  edits: TextEdit[],
) {
  const existing = sectionObject.properties.find((property) => getPropertyName(property) === propertyName);
  if (existing) {
    edits.push({
      end: getEndIncludingComma(text, existing.end),
      start: existing.getStart(sourceFile),
      text: `${propertyName}: "${value}",`,
    });
    return;
  }

  const sectionIdProperty = sectionObject.properties.find((property) => getPropertyName(property) === "sectionId");
  if (!sectionIdProperty) throw new Error(`sectionId property missing for section ${sectionId}`);

  const insertAt = getLineEndIncludingNewline(text, sectionIdProperty.end);
  const indent = getLineIndent(text, sectionIdProperty.getStart(sourceFile));
  edits.push({
    end: insertAt,
    start: insertAt,
    text: `${indent}${propertyName}: "${value}",\n`,
  });
}

function updateIllustrationKind(
  sourceFile: ts.SourceFile,
  text: string,
  sectionObject: ts.ObjectLiteralExpression,
  sectionId: number,
  illustrationKind: TextIllustrationKind,
  edits: TextEdit[],
) {
  updateStringProperty(sourceFile, text, sectionObject, sectionId, "illustrationKind", illustrationKind, edits);
}

function updateIllustrationVisibility(
  sourceFile: ts.SourceFile,
  text: string,
  sectionObject: ts.ObjectLiteralExpression,
  sectionId: number,
  illustrationVisibility: IllustrationVisibility,
  edits: TextEdit[],
) {
  updateStringProperty(
    sourceFile,
    text,
    sectionObject,
    sectionId,
    "illustrationVisibility",
    illustrationVisibility,
    edits,
  );
}

function updateTimestamp(
  sourceFile: ts.SourceFile,
  sectionObject: ts.ObjectLiteralExpression,
  sectionId: number,
  timestamp: string,
  edits: TextEdit[],
) {
  const existing = sectionObject.properties.find((property) => getPropertyName(property) === "timestamp");
  if (!existing || !ts.isPropertyAssignment(existing) || !ts.isStringLiteral(existing.initializer)) {
    throw new Error(`timestamp property missing for section ${sectionId}`);
  }

  edits.push({
    end: existing.initializer.end,
    start: existing.initializer.getStart(sourceFile),
    text: `"${timestamp}"`,
  });
}

function updateLyricsSource(text: string, changes: AnimationChange[]) {
  const sourceFile = ts.createSourceFile(LYRICS_FILE, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const lyricsArray = findLyricsArray(sourceFile);
  const edits: TextEdit[] = [];

  changes.forEach((change) => {
    const {
      hasIllustrationAnimation,
      hasIllustrationKind,
      hasIllustrationVisibility,
      illustrationAnimation,
      illustrationKind,
      illustrationVisibility,
      sectionId,
      timestamp,
    } = change;
    const sectionObject = lyricsArray.elements.find(
      (element): element is ts.ObjectLiteralExpression =>
        ts.isObjectLiteralExpression(element) && getSectionId(element) === sectionId,
    );
    if (!sectionObject) throw new Error(`Section ${sectionId} not found`);

    if (timestamp !== undefined) updateTimestamp(sourceFile, sectionObject, sectionId, timestamp, edits);
    if (hasIllustrationKind) {
      if (!illustrationKind) throw new Error(`illustrationKind missing for section ${sectionId}`);
      updateIllustrationKind(sourceFile, text, sectionObject, sectionId, illustrationKind, edits);
    }
    if (hasIllustrationVisibility) {
      if (!illustrationVisibility) throw new Error(`illustrationVisibility missing for section ${sectionId}`);
      updateIllustrationVisibility(sourceFile, text, sectionObject, sectionId, illustrationVisibility, edits);
    }
    if (!hasIllustrationAnimation) return;

    const existing = sectionObject.properties.find(
      (property) => getPropertyName(property) === "illustrationAnimation",
    );

    if (existing && illustrationAnimation === null) {
      const start = getLineStart(text, existing.getStart(sourceFile));
      const end = getLineEndIncludingNewline(text, getEndIncludingComma(text, existing.end));
      edits.push({ end, start, text: "" });
      return;
    }

    if (existing && illustrationAnimation) {
      edits.push({
        end: getEndIncludingComma(text, existing.end),
        start: existing.getStart(sourceFile),
        text: `illustrationAnimation: ${formatAnimation(illustrationAnimation)},`,
      });
      return;
    }

    if (!existing && illustrationAnimation) {
      const sectionIdProperty = sectionObject.properties.find((property) => getPropertyName(property) === "sectionId");
      if (!sectionIdProperty) throw new Error(`sectionId property missing for section ${sectionId}`);

      const insertAt = getLineEndIncludingNewline(text, sectionIdProperty.end);
      const indent = getLineIndent(text, sectionIdProperty.getStart(sourceFile));
      edits.push({
        end: insertAt,
        start: insertAt,
        text: `${indent}illustrationAnimation: ${formatAnimation(illustrationAnimation)},\n`,
      });
    }
  });

  return edits
    .sort((left, right) => right.start - left.start)
    .reduce((current, edit) => current.slice(0, edit.start) + edit.text + current.slice(edit.end), text);
}

export function illustrationAnimationTuningPlugin(): Plugin {
  return {
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.method !== "POST" || request.url?.split("?")[0] !== TUNING_ENDPOINT) {
          next();
          return;
        }

        let body = "";
        request.setEncoding("utf8");
        request.on("data", (chunk: string) => {
          body += chunk;
        });
        request.on("end", () => {
          try {
            const changes = parseChanges(JSON.parse(body));
            const source = readFileSync(LYRICS_FILE, "utf8");
            writeFileSync(LYRICS_FILE, updateLyricsSource(source, changes));
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ ok: true }));
          } catch (error) {
            response.statusCode = 400;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }));
          }
        });
      });
    },
    handleHotUpdate(context) {
      if (normalizePath(context.file) === NORMALIZED_LYRICS_FILE) return [];
    },
    name: "dong-liu-illustration-animation-tuning",
  };
}
