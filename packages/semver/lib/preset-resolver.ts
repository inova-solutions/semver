// Copy of: https://github.com/conventional-changelog/conventional-changelog/blob/master/packages/conventional-recommended-bump/preset-resolver.js
'use strict';
import { Options } from 'conventional-recommended-bump';
import * as Q from "q";

export async function presetResolver(presetPackage: unknown) :Promise<PresetResolverResult> {
  // start the chain as a Q.Promise
  return Q.resolve().then(() => {
    // handle traditional node-style callbacks
    if (typeof presetPackage === 'function') {
      return Q.nfcall(presetPackage);
    }

    // handle object literal or Promise instance
    if (typeof presetPackage === 'object') {
      return Q(presetPackage);
    }

    throw new Error('preset package must be a promise, function, or object');
  });
}

export interface PresetResolverResult {
  recommendedBumpOpts: {
    whatBump: Options.WhatBump,
    parserOpts: unknown,
  }
  parserOpts: unknown
}
