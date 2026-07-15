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
      wordStartPercents?: number[];
    };

type IllustrationVisibility = "adjacent" | "only-active" | "start-active" | "active-end";
type TextIllustrationKind = "blinking-words" | "kinetic-warp" | "vertical-typewriter" | "word-cloud" | "word-train";

type AnimationChange = {
  continuing?: boolean;
  enterDuration?: number;
  exitDuration?: number;
  hasIllustrationAnimation: boolean;
  hasContinuing: boolean;
  hasEnterDuration: boolean;
  hasExitDuration: boolean;
  hasIllustrationFadeIn: boolean;
  hasIllustrationFadeOut: boolean;
  hasIllustrationKind: boolean;
  hasIllustrationVisibility: boolean;
  hasNoSlideBy: boolean;
  hasOverlay: boolean;
  hasSectionWidth: boolean;
  illustrationAnimation: AnimationSetting | null;
  illustrationFadeInMs?: number;
  illustrationFadeOutMs?: number;
  illustrationKind?: TextIllustrationKind;
  illustrationVisibility?: IllustrationVisibility;
  isOverlay?: boolean;
  noSlideBy?: boolean;
  sectionId: number;
  sectionWidthPercent?: number;
  timestamp?: string;
};

type TextEdit = {
  end: number;
  start: number;
  text: string;
};

type IllustrationAnimationTuningPluginOptions = {
  tracks: Record<
    string,
    {
      lyricsExport: string;
      lyricsFile: string;
    }
  >;
};

type TuningTarget = {
  lyricsExport: string;
  lyricsFile: string;
  normalizedLyricsFile: string;
};

const TUNING_ENDPOINT = "/__dong-liu/illustration-animation-settings";
const FADE_TIMING_MAX_MS = 1000;
const DEFAULT_SECTION_WIDTH_PERCENT = 90;
const SLIDE_MOTION_DURATION_MAX_MS = 1000;

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
  const animationLengthPercent =
    value.animationLengthPercent === undefined ? 100 : Number(value.animationLengthPercent);
  if (!Number.isFinite(startPercent) || startPercent < 0 || startPercent > 50) {
    throw new Error("startPercent must be 0-50");
  }
  if (!Number.isFinite(endPercent) || endPercent < 51 || endPercent > 100) {
    throw new Error("endPercent must be 51-100");
  }
  if (!Number.isFinite(animationLengthPercent) || animationLengthPercent < 0 || animationLengthPercent > 100) {
    throw new Error("animationLengthPercent must be 0-100");
  }

  const wordStartPercents = value.wordStartPercents === undefined ? undefined : value.wordStartPercents;
  if (wordStartPercents !== undefined && (!Array.isArray(wordStartPercents) || wordStartPercents.some((item) => !Number.isFinite(Number(item)) || Number(item) < 0 || Number(item) > 100))) {
    throw new Error("wordStartPercents must contain percentages from 0-100");
  }
  return { animationLengthPercent, endPercent, startPercent, variant: "range", wordStartPercents: wordStartPercents?.map(Number) };
}

function parseIllustrationVisibility(value: unknown): IllustrationVisibility {
  if (value === "adjacent" || value === "only-active" || value === "start-active" || value === "active-end") {
    return value;
  }

  throw new Error("Invalid illustration visibility");
}

function parseFadeDuration(value: unknown, propertyName: string) {
  const duration = Number(value);
  if (!Number.isInteger(duration) || duration < 0 || duration > FADE_TIMING_MAX_MS) {
    throw new Error(`${propertyName} must be 0-${FADE_TIMING_MAX_MS}`);
  }

  return duration;
}

function parseSlideMotionDuration(value: unknown, propertyName: string) {
  const duration = Number(value);
  if (!Number.isInteger(duration) || duration < 0 || duration > SLIDE_MOTION_DURATION_MAX_MS) {
    throw new Error(`${propertyName} must be 0-${SLIDE_MOTION_DURATION_MAX_MS}`);
  }

  return duration;
}

function parsePercent(value: unknown, propertyName: string, min: number, max: number, step = 1) {
  const percent = Number(value);
  if (!Number.isInteger(percent) || percent < min || percent > max || percent % step !== 0) {
    throw new Error(`${propertyName} must be ${min}-${max}${step > 1 ? ` in ${step}% steps` : ""}`);
  }

  return percent;
}

function parseBoolean(value: unknown, propertyName: string) {
  if (typeof value === "boolean") return value;

  throw new Error(`${propertyName} must be a boolean`);
}

function parseIllustrationKind(value: unknown): TextIllustrationKind {
  if (value === "blinking-words" || value === "kinetic-warp" || value === "vertical-typewriter" || value === "word-cloud" || value === "word-train") return value;

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

function parseRequest(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.changes)) throw new Error("Expected changes array");
  if (typeof value.trackId !== "string" || !value.trackId) throw new Error("Expected trackId");

  const changes = value.changes.map((entry) => {
    if (!isRecord(entry)) throw new Error("Invalid change");

    const sectionId = Number(entry.sectionId);
    if (!Number.isInteger(sectionId) || sectionId <= 0) throw new Error("Invalid sectionId");

    const hasIllustrationAnimation = Object.hasOwn(entry, "illustrationAnimation");
    const hasContinuing = Object.hasOwn(entry, "continuing");
    const hasEnterDuration = Object.hasOwn(entry, "enterDuration");
    const hasExitDuration = Object.hasOwn(entry, "exitDuration");
    const hasIllustrationFadeIn = Object.hasOwn(entry, "illustrationFadeInMs");
    const hasIllustrationFadeOut = Object.hasOwn(entry, "illustrationFadeOutMs");
    const hasIllustrationKind = Object.hasOwn(entry, "illustrationKind");
    const hasIllustrationVisibility = Object.hasOwn(entry, "illustrationVisibility");
    const hasNoSlideBy = Object.hasOwn(entry, "noSlideBy");
    const hasOverlay = Object.hasOwn(entry, "isOverlay");
    const hasSectionWidth = Object.hasOwn(entry, "sectionWidthPercent");
    const hasTimestamp = Object.hasOwn(entry, "timestamp");
    if (
      !hasIllustrationAnimation &&
      !hasContinuing &&
      !hasEnterDuration &&
      !hasExitDuration &&
      !hasIllustrationFadeIn &&
      !hasIllustrationFadeOut &&
      !hasIllustrationKind &&
      !hasIllustrationVisibility &&
      !hasNoSlideBy &&
      !hasOverlay &&
      !hasSectionWidth &&
      !hasTimestamp
    ) {
      throw new Error("Change must include a tuning value");
    }

    return {
      continuing: hasContinuing ? parseBoolean(entry.continuing, "continuing") : undefined,
      enterDuration: hasEnterDuration ? parseSlideMotionDuration(entry.enterDuration, "enterDuration") : undefined,
      exitDuration: hasExitDuration ? parseSlideMotionDuration(entry.exitDuration, "exitDuration") : undefined,
      hasIllustrationAnimation,
      hasContinuing,
      hasEnterDuration,
      hasExitDuration,
      hasIllustrationFadeIn,
      hasIllustrationFadeOut,
      hasIllustrationKind,
      hasIllustrationVisibility,
      hasNoSlideBy,
      hasOverlay,
      hasSectionWidth,
      illustrationAnimation: hasIllustrationAnimation ? parseAnimation(entry.illustrationAnimation) : null,
      illustrationFadeInMs: hasIllustrationFadeIn
        ? parseFadeDuration(entry.illustrationFadeInMs, "illustrationFadeInMs")
        : undefined,
      illustrationFadeOutMs: hasIllustrationFadeOut
        ? parseFadeDuration(entry.illustrationFadeOutMs, "illustrationFadeOutMs")
        : undefined,
      illustrationKind: hasIllustrationKind ? parseIllustrationKind(entry.illustrationKind) : undefined,
      illustrationVisibility: hasIllustrationVisibility
        ? parseIllustrationVisibility(entry.illustrationVisibility)
        : undefined,
      isOverlay: hasOverlay ? parseBoolean(entry.isOverlay, "isOverlay") : undefined,
      noSlideBy: hasNoSlideBy ? parseBoolean(entry.noSlideBy, "noSlideBy") : undefined,
      sectionId,
      sectionWidthPercent: hasSectionWidth
        ? parsePercent(entry.sectionWidthPercent, "sectionWidthPercent", 0, 100, 5)
        : undefined,
      timestamp: hasTimestamp ? parseTimestamp(entry.timestamp) : undefined,
    };
  });

  return { changes, trackId: value.trackId };
}

function getPropertyName(property: ts.ObjectLiteralElementLike) {
  if (!ts.isPropertyAssignment(property)) return null;
  const name = property.name;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;

  return null;
}

function findLyricsArray(sourceFile: ts.SourceFile, lyricsExport: string) {
  let lyricsArray: ts.ArrayLiteralExpression | undefined;

  const visit = (node: ts.Node) => {
    if (lyricsArray) return;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === lyricsExport &&
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
  if (!foundLyricsArray) throw new Error(`${lyricsExport} array not found`);

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

  const wordStarts = animation.wordStartPercents ? `, wordStartPercents: [${animation.wordStartPercents.join(", ")}]` : "";
  return `{ variant: "range", startPercent: ${animation.startPercent}, endPercent: ${animation.endPercent}, animationLengthPercent: ${animation.animationLengthPercent}${wordStarts} }`;
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

function updateOptionalNumberProperty(
  sourceFile: ts.SourceFile,
  text: string,
  sectionObject: ts.ObjectLiteralExpression,
  sectionId: number,
  propertyName: string,
  value: number,
  defaultValue: number,
  edits: TextEdit[],
) {
  const existing = sectionObject.properties.find((property) => getPropertyName(property) === propertyName);
  if (existing && value === defaultValue) {
    const start = getLineStart(text, existing.getStart(sourceFile));
    const end = getLineEndIncludingNewline(text, getEndIncludingComma(text, existing.end));
    edits.push({ end, start, text: "" });
    return;
  }
  if (!existing && value === defaultValue) return;
  if (existing) {
    edits.push({
      end: getEndIncludingComma(text, existing.end),
      start: existing.getStart(sourceFile),
      text: `${propertyName}: ${value},`,
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
    text: `${indent}${propertyName}: ${value},\n`,
  });
}

function updateNumberProperty(
  sourceFile: ts.SourceFile,
  text: string,
  sectionObject: ts.ObjectLiteralExpression,
  sectionId: number,
  propertyName: string,
  value: number,
  edits: TextEdit[],
) {
  const existing = sectionObject.properties.find((property) => getPropertyName(property) === propertyName);
  if (existing) {
    edits.push({
      end: getEndIncludingComma(text, existing.end),
      start: existing.getStart(sourceFile),
      text: `${propertyName}: ${value},`,
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
    text: `${indent}${propertyName}: ${value},\n`,
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

function updateOptionalTrueBooleanProperty(
  sourceFile: ts.SourceFile,
  text: string,
  sectionObject: ts.ObjectLiteralExpression,
  sectionId: number,
  propertyName: string,
  value: boolean,
  edits: TextEdit[],
) {
  const existing = sectionObject.properties.find((property) => getPropertyName(property) === propertyName);
  if (!value && existing) {
    const start = getLineStart(text, existing.getStart(sourceFile));
    const end = getLineEndIncludingNewline(text, getEndIncludingComma(text, existing.end));
    edits.push({ end, start, text: "" });
    return;
  }
  if (!value) return;
  if (existing) {
    edits.push({
      end: getEndIncludingComma(text, existing.end),
      start: existing.getStart(sourceFile),
      text: `${propertyName}: true,`,
    });
    return;
  }

  const sectionIdProperty = sectionObject.properties.find((property) => getPropertyName(property) === "sectionId");
  if (!sectionIdProperty) throw new Error(`sectionId property missing for section ${sectionId}`);

  const insertAt = getLineEndIncludingNewline(text, sectionIdProperty.end);
  const indent = getLineIndent(text, sectionIdProperty.getStart(sourceFile));
  edits.push({ end: insertAt, start: insertAt, text: `${indent}${propertyName}: true,\n` });
}

function updateBooleanProperty(
  sourceFile: ts.SourceFile,
  text: string,
  sectionObject: ts.ObjectLiteralExpression,
  sectionId: number,
  propertyName: string,
  value: boolean,
  edits: TextEdit[],
) {
  const existing = sectionObject.properties.find((property) => getPropertyName(property) === propertyName);
  if (existing) {
    edits.push({
      end: getEndIncludingComma(text, existing.end),
      start: existing.getStart(sourceFile),
      text: `${propertyName}: ${value},`,
    });
    return;
  }

  const sectionIdProperty = sectionObject.properties.find((property) => getPropertyName(property) === "sectionId");
  if (!sectionIdProperty) throw new Error(`sectionId property missing for section ${sectionId}`);

  const insertAt = getLineEndIncludingNewline(text, sectionIdProperty.end);
  const indent = getLineIndent(text, sectionIdProperty.getStart(sourceFile));
  edits.push({ end: insertAt, start: insertAt, text: `${indent}${propertyName}: ${value},\n` });
}

function updateOverlay(
  sourceFile: ts.SourceFile,
  text: string,
  sectionObject: ts.ObjectLiteralExpression,
  sectionId: number,
  isOverlay: boolean,
  edits: TextEdit[],
) {
  updateOptionalTrueBooleanProperty(sourceFile, text, sectionObject, sectionId, "isOverlay", isOverlay, edits);
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

function updateLyricsSource(text: string, changes: AnimationChange[], target: TuningTarget) {
  const sourceFile = ts.createSourceFile(target.lyricsFile, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const lyricsArray = findLyricsArray(sourceFile, target.lyricsExport);
  const edits: TextEdit[] = [];

  changes.forEach((change) => {
    const {
      continuing,
      enterDuration,
      exitDuration,
      hasEnterDuration,
      hasExitDuration,
      hasIllustrationAnimation,
      hasContinuing,
      hasIllustrationFadeIn,
      hasIllustrationFadeOut,
      hasIllustrationKind,
      hasIllustrationVisibility,
      hasNoSlideBy,
      hasOverlay,
      hasSectionWidth,
      illustrationAnimation,
      illustrationFadeInMs,
      illustrationFadeOutMs,
      illustrationKind,
      illustrationVisibility,
      isOverlay,
      noSlideBy,
      sectionId,
      sectionWidthPercent,
      timestamp,
    } = change;
    const sectionObject = lyricsArray.elements.find(
      (element): element is ts.ObjectLiteralExpression =>
        ts.isObjectLiteralExpression(element) && getSectionId(element) === sectionId,
    );
    if (!sectionObject) throw new Error(`Section ${sectionId} not found`);

    if (timestamp !== undefined) updateTimestamp(sourceFile, sectionObject, sectionId, timestamp, edits);
    if (hasContinuing) {
      updateOptionalTrueBooleanProperty(
        sourceFile,
        text,
        sectionObject,
        sectionId,
        "continuing",
        Boolean(continuing),
        edits,
      );
    }
    if (hasEnterDuration) {
      updateNumberProperty(sourceFile, text, sectionObject, sectionId, "enterDuration", enterDuration ?? 0, edits);
    }
    if (hasExitDuration) {
      updateNumberProperty(sourceFile, text, sectionObject, sectionId, "exitDuration", exitDuration ?? 0, edits);
    }
    if (hasIllustrationKind) {
      if (!illustrationKind) throw new Error(`illustrationKind missing for section ${sectionId}`);
      updateIllustrationKind(sourceFile, text, sectionObject, sectionId, illustrationKind, edits);
    }
    if (hasIllustrationFadeIn) {
      updateOptionalNumberProperty(
        sourceFile,
        text,
        sectionObject,
        sectionId,
        "illustrationFadeInMs",
        illustrationFadeInMs ?? 0,
        0,
        edits,
      );
    }
    if (hasIllustrationFadeOut) {
      updateOptionalNumberProperty(
        sourceFile,
        text,
        sectionObject,
        sectionId,
        "illustrationFadeOutMs",
        illustrationFadeOutMs ?? 0,
        0,
        edits,
      );
    }
    if (hasIllustrationVisibility) {
      if (!illustrationVisibility) throw new Error(`illustrationVisibility missing for section ${sectionId}`);
      updateIllustrationVisibility(sourceFile, text, sectionObject, sectionId, illustrationVisibility, edits);
    }
    if (hasOverlay) updateOverlay(sourceFile, text, sectionObject, sectionId, Boolean(isOverlay), edits);
    if (hasNoSlideBy) {
      updateBooleanProperty(sourceFile, text, sectionObject, sectionId, "noSlideBy", Boolean(noSlideBy), edits);
    }
    if (hasSectionWidth) {
      updateOptionalNumberProperty(
        sourceFile,
        text,
        sectionObject,
        sectionId,
        "sectionWidthPercent",
        sectionWidthPercent ?? DEFAULT_SECTION_WIDTH_PERCENT,
        DEFAULT_SECTION_WIDTH_PERCENT,
        edits,
      );
    }
    if (!hasIllustrationAnimation) return;

    const existing = sectionObject.properties.find((property) => getPropertyName(property) === "illustrationAnimation");

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
    .map((edit, index) => ({ ...edit, index }))
    .sort((left, right) => right.start - left.start || right.index - left.index)
    .reduce((current, edit) => current.slice(0, edit.start) + edit.text + current.slice(edit.end), text);
}

export function illustrationAnimationTuningPlugin(options: IllustrationAnimationTuningPluginOptions): Plugin {
  const targets = new Map<string, TuningTarget>(
    Object.entries(options.tracks).map(([trackId, target]) => {
      const lyricsFile = resolve(target.lyricsFile);

      return [
        trackId,
        {
          lyricsExport: target.lyricsExport,
          lyricsFile,
          normalizedLyricsFile: normalizePath(lyricsFile),
        },
      ];
    }),
  );

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
            const { changes, trackId } = parseRequest(JSON.parse(body));
            const target = targets.get(trackId);
            if (!target) throw new Error(`Track "${trackId}" is not enabled for tuning`);

            const source = readFileSync(target.lyricsFile, "utf8");
            writeFileSync(target.lyricsFile, updateLyricsSource(source, changes, target));
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
      const normalizedFile = normalizePath(context.file);
      if ([...targets.values()].some((target) => target.normalizedLyricsFile === normalizedFile)) return [];
    },
    hotUpdate(options) {
      const normalizedFile = normalizePath(options.file);
      if ([...targets.values()].some((target) => target.normalizedLyricsFile === normalizedFile)) return [];
    },
    name: "dong-liu-illustration-animation-tuning",
  };
}
