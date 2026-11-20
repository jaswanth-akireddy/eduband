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

  // Rewrite the props going IN to render, never the element coming OUT.
  //
  // The first version cloned the returned element, which was wrong on both
  // platforms in different ways:
  //  - Native: a top-level Text renders <TextAncestor.Provider><NativeText/>.
  //    The clone put `style` on the Context Provider, which ignores it, so the
  //    patch silently did nothing and the app shipped in the system font.
  //  - Web: the returned element is a DOM <span> whose style is already a
  //    resolved object. Cloning a style *array* onto it threw ("Failed to set
  //    an indexed property on CSSStyleDeclaration") and unmounted the tree.
  // Text forwards `style` to its host node on every platform, so changing the
  // input is the one place the fix reaches what actually draws the glyphs.
  for (const Component of [Text, TextInput] as unknown as {
    render?: (props: Record<string, unknown>, ref: unknown) => React.ReactElement;
  }[]) {
    const original = Component.render;
    if (typeof original !== 'function') continue;
    Component.render = function patchedRender(props, ref) {
      let next = props;
      try {
        const style = props?.style;
        next = {
          ...props,
          style: [style, { fontFamily: familyFor(style), fontWeight: undefined }],
        };
      } catch {
        next = props; // never let typography break rendering
      }
      return original.call(this, next, ref);
    };
  }
}
