import React, { useId, useLayoutEffect } from 'react';
import { Image } from 'react-native';

// Track the actual rendered image, not a second invisible thumbnail. A rerender
// with a fresh source object but the same URI must preserve its ready state.
export function MirrorCanvasImage({ source, onImageState, ...props }) {
  const id = useId();
  const uri = source?.uri;
  useLayoutEffect(() => {
    onImageState?.(id, { uri, status: 'pending' });
    return () => onImageState?.(id, null);
  }, [id, onImageState, uri]);
  return <Image {...props} source={source}
    onLoad={() => onImageState?.(id, { uri, status: 'ready' })}
    onError={(event) => onImageState?.(id, { uri, status: 'failed', reason: event.nativeEvent?.error })}
  />;
}
