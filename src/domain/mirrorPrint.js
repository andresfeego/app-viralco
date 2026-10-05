export function canPrintComposition(run) {
  const config = run?.configSnapshot;
  return Boolean(config?.print?.enabled && config?.delivery?.print && run.output?.uri?.startsWith('file://') && run.output.localAvailable !== false);
}

export function printOptions(config, profile) {
  const p = config?.print;
  if (!p?.enabled || !config.delivery?.print || !profile || profile.kind !== 'print-profile') throw new Error('PRINT_PROFILE_REQUIRED');
  const width = Number(p.paperWidthCm) * 10, height = Number(p.paperHeightCm) * 10;
  const options = {
    widthMm: p.orientation === 'landscape' ? Math.max(width, height) : Math.min(width, height),
    heightMm: p.orientation === 'landscape' ? Math.min(width, height) : Math.max(width, height),
    marginMm: Number(p.marginCm) * 10, dpi: Number(p.dpi), copies: Number(p.copies),
    fit: p.fit, twoPerPage: Boolean(p.twoPerPage), colorMode: profile.output?.colorMode,
  };
  if (![width, height].every(v => Number.isFinite(v) && v >= 20 && v <= 2000)
    || !Number.isFinite(options.marginMm) || options.marginMm < 0 || options.marginMm >= Math.min(width, height) / 2
    || !Number.isInteger(options.copies) || options.copies < 1 || options.copies > Math.min(100, profile.output?.maxCopies || 100)
    || !Number.isInteger(options.dpi) || options.dpi < 72 || options.dpi > 1200
    || !['contain', 'cover'].includes(options.fit) || !['color', 'grayscale'].includes(options.colorMode)
    || (options.twoPerPage && !profile.output?.supportsTwoPerPage)) throw new Error('PRINT_SETTINGS_INVALID');
  return options;
}

// Reference geometry in points. Native renderers additionally enforce hardware bounds.
export function printCells(width, height, margin, twoPerPage) {
  const box = { x: margin, y: margin, width: width - margin * 2, height: height - margin * 2 };
  if (!twoPerPage) return [box];
  return width >= height
    ? [{ ...box, width: box.width / 2 }, { ...box, x: margin + box.width / 2, width: box.width / 2 }]
    : [{ ...box, height: box.height / 2 }, { ...box, y: margin + box.height / 2, height: box.height / 2 }];
}

export function fittedPrintRect(imageWidth, imageHeight, cell, fit) {
  const scale = (fit === 'cover' ? Math.max : Math.min)(cell.width / imageWidth, cell.height / imageHeight);
  const width = imageWidth * scale, height = imageHeight * scale;
  return { x: cell.x + (cell.width - width) / 2, y: cell.y + (cell.height - height) / 2, width, height };
}

export function groupPrintItems(items) {
  const groups = new Map();
  for (const item of items) {
    const key = JSON.stringify(item.options);
    if (!groups.has(key)) groups.set(key, { options: item.options, items: [] });
    groups.get(key).items.push({ path: item.path, id: item.id });
  }
  return [...groups.values()];
}
