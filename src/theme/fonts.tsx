// Poppins, app-wide.
//
// The catch: on Android a custom font ignores `fontWeight` — each weight is a
// separate family. The app styles weight with fontWeight in ~100 places, so
// instead of rewriting every stylesheet we patch Text once at the root: the
// final merged style's fontWeight is resolved to the matching Poppins family
// and the numeric weight is stripped (so iOS doesn't synthesise a second bold).
// This also covers text we don't own — navigation headers and tab labels.

import React from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import {
  Poppins_200ExtraLight,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

// Every weight the app actually uses (see the audit: 200/300/500/600/700/800).
export const poppinsFonts = {
  Poppins_200ExtraLight,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
};

export const POPPINS_REGULAR = 'Poppins_400Regular';

// fontWeight -> family. 800/900 fall back to Bold (we don't ship a heavier cut).
const BY_WEIGHT: Record<string, string> = {
  '100': 'Poppins_200ExtraLight',
  '200': 'Poppins_200ExtraLight',
  '300': 'Poppins_300Light',
  '400': POPPINS_REGULAR,
  normal: POPPINS_REGULAR,
  '500': 'Poppins_500Medium',
  '600': 'Poppins_600SemiBold',
  '700': 'Poppins_700Bold',
  bold: 'Poppins_700Bold',
  '800': 'Poppins_700Bold',
  '900': 'Poppins_700Bold',
};

function familyFor(style: unknown): string {
  const flat = (StyleSheet.flatten(style as never) ?? {}) as {
    fontWeight?: string | number;
  };
  return BY_WEIGHT[String(flat.fontWeight ?? '400')] ?? POPPINS_REGULAR;
}

let patched = false;

// Call once, after the fonts have loaded.
export function applyPoppins(): void {
  if (patched) return;
  patched = true;

  for (const Component of [Text, TextInput] as unknown as {
    render?: (...args: unknown[]) => React.ReactElement;
  }[]) {
    const original = Component.render;
    if (typeof original !== 'function') continue;
    Component.render = function patchedRender(...args: unknown[]) {
      const element = original.apply(this, args);
      try {
        const style = (element.props as { style?: unknown }).style;
        return React.cloneElement(element, {
          style: [style, { fontFamily: familyFor(style), fontWeight: undefined }],
        } as never);
      } catch {
        return element; // never let typography break rendering
      }
    };
  }
}
