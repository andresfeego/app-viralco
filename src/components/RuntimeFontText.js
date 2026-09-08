import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { loadRuntimeFont } from '../services/runtimeFonts';

const BUILT_IN_FONTS = {
  arial: 'Arial',
  georgia: 'Georgia',
  impact: 'Impact',
  verdana: 'Verdana',
  courier: 'Courier',
};

export function RuntimeFontText({ layer, resource, style, children, ...props }) {
  const [runtimeFamily, setRuntimeFamily] = useState(null);
  const resourceId = String(layer?.fontResourceId || '');

  useEffect(() => {
    let active = true;
    setRuntimeFamily(null);
    if (layer?.font !== 'resource' || !resourceId || !resource) return () => { active = false; };
    loadRuntimeFont(resource).then((family) => { if (active) setRuntimeFamily(family); });
    return () => { active = false; };
  }, [layer?.font, resource, resourceId]);

  const fontFamily = layer?.font === 'resource'
    ? runtimeFamily
    : BUILT_IN_FONTS[layer?.font] || undefined;
  return <Text {...props} style={[style, fontFamily ? { fontFamily } : null, layer?.font === 'resource' && fontFamily ? styles.resourceFont : null]}>{children}</Text>;
}

const styles = {
  resourceFont: { fontWeight: 'normal' },
};
