import { isAbsolute } from 'path';
import { Commit } from 'conventional-commits-parser';

export async function loadPreset(preset: string): Promise<PresetResolverResult> {
  const createPreset = loadPresetFactory(preset);
  const config = createPreset.length > 0 ? await loadCallbackPreset(createPreset) : await createPreset();

  return presetResolver(config);
}

export async function presetResolver(presetPackage: unknown): Promise<PresetResolverResult> {
  if (typeof presetPackage === 'function') {
    return presetResolver(await presetPackage());
  }

  if (presetPackage && typeof presetPackage === 'object') {
    return await Promise.resolve(presetPackage as PresetResolverResult);
  }

  throw new Error('preset package must be a promise, function, or object');
}

function loadPresetFactory(preset: string): PresetFactory {
  let error: unknown;

  for (const presetName of resolvePresetNameVariants(preset)) {
    try {
      const presetFactory = getModuleDefaultExport(require(presetName));

      if (!isPresetFactory(presetFactory)) {
        throw new Error(
          `The "${preset}" preset does not export a function. Maybe you are using an old version of the preset. Please upgrade.`,
        );
      }

      return presetFactory;
    } catch (currentError) {
      error = currentError;
    }
  }

  const presetLoadError = new Error(`Unable to load the "${preset}" preset. Please make sure it's installed.`);
  (presetLoadError as Error & { cause?: unknown }).cause = error;
  throw presetLoadError;
}

function resolvePresetNameVariants(preset: string): string[] {
  if (isAbsolute(preset)) {
    return [preset];
  }

  let scope = '';
  let name = preset.toLowerCase();

  if (preset.startsWith('@')) {
    const parts = preset.split('/');
    scope = `${parts.shift()}/`;

    if (scope === '@conventional-changelog/') {
      return [preset];
    }

    name = parts.join('/');
  }

  if (!name.startsWith('conventional-changelog-')) {
    name = `conventional-changelog-${name}`;
  }

  const resolvedPreset = `${scope}${name}`;
  return resolvedPreset !== preset ? [resolvedPreset, preset] : [preset];
}

function getModuleDefaultExport(module: unknown): unknown {
  if (module && typeof module === 'object' && 'default' in module) {
    return (module as { default: unknown }).default;
  }

  return module;
}

function isPresetFactory(presetFactory: unknown): presetFactory is PresetFactory {
  return typeof presetFactory === 'function';
}

function loadCallbackPreset(createPreset: PresetFactory): Promise<PresetResolverResult> {
  return new Promise((resolve, reject) => {
    createPreset((error: Error | null | undefined, config: PresetResolverResult) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(config);
    });
  });
}

type PresetFactory = {
  (): PresetResolverResult | Promise<PresetResolverResult>;
  (callback: (error: Error | null | undefined, config: PresetResolverResult) => void): void;
};

export interface PresetResolverResult {
  recommendedBumpOpts: {
    whatBump: WhatBump;
    parserOpts: unknown;
  };
  parserOpts: unknown;
}

export interface WhatBumpResult {
  level: 0 | 1 | 2;
  reason: string;
}

export type WhatBump = (
  commits: Commit[],
) => WhatBumpResult | null | undefined | Promise<WhatBumpResult | null | undefined>;
