// Test-card media, intentionally independent of app theme/design-system colors.
// A vector source is kept in the repository; simulated shutters export a JPEG.
const bars = ['#ffffff', '#ffff00', '#00ffff', '#00ff00', '#ff00ff', '#ff0000', '#0000ff'];
export const simulatorTestSignal = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1600" viewBox="0 0 900 1600">
<rect width="900" height="1600" fill="#000000"/>
${bars.map((color, index) => `<rect x="${index * 900 / 7}" y="0" width="${900 / 7 + 1}" height="1120" fill="${color}"/>`).join('')}
${bars.slice().reverse().map((color, index) => `<rect x="${index * 900 / 7}" y="1120" width="${900 / 7 + 1}" height="160" fill="${color}"/>`).join('')}
<rect y="1310" width="900" height="12" fill="#ffffff"/>
<text x="450" y="1430" text-anchor="middle" font-family="monospace" font-size="52" fill="#ffffff">KAPTURA · TEST</text>
<text x="450" y="1500" text-anchor="middle" font-family="monospace" font-size="30" fill="#ffffff">SIMULATOR / NO SIGNAL</text>
</svg>`;
