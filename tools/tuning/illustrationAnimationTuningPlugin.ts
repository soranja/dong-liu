import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizePath, type Plugin } from 'vite';
import { ILLUSTRATION_TUNING_ENDPOINT } from '../../src/shared/config/tuning';
import { parseTuningRequest } from './parseTuningRequest';
import type { IllustrationAnimationTuningPluginOptions, TuningTarget } from './types';
import { updateLyricsSource } from './updateLyricsSource';

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
  const isTuningTarget = (file: string) =>
    [...targets.values()].some((target) => target.normalizedLyricsFile === normalizePath(file));

  return {
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.method !== 'POST' || request.url?.split('?')[0] !== ILLUSTRATION_TUNING_ENDPOINT) {
          next();
          return;
        }

        let body = '';
        request.setEncoding('utf8');
        request.on('data', (chunk: string) => {
          body += chunk;
        });
        request.on('end', () => {
          try {
            const { changes, trackId } = parseTuningRequest(JSON.parse(body));
            const target = targets.get(trackId);
            if (!target) throw new Error(`Track "${trackId}" is not enabled for tuning`);

            const source = readFileSync(target.lyricsFile, 'utf8');
            writeFileSync(target.lyricsFile, updateLyricsSource(source, changes, target));
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ ok: true }));
          } catch (error) {
            response.statusCode = 400;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }));
          }
        });
      });
    },
    handleHotUpdate: ({ file }) => (isTuningTarget(file) ? [] : undefined),
    hotUpdate: ({ file }) => (isTuningTarget(file) ? [] : undefined),
    name: 'dong-liu-illustration-animation-tuning',
  };
}
