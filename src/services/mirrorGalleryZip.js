import { Buffer } from 'buffer';
import { Zip, ZipPassThrough } from 'fflate';
import { CachesDirectoryPath, mkdir, read, stat, writeFile, appendFile, unlink, getFSInfo } from '@dr.pogodin/react-native-fs';
import { createClientUuid } from '../domain/mirrorRuntime';

// JPEGs are already compressed: stream a stored ZIP with bounded memory.
// See https://github.com/101arrowz/fflate#usage (streaming ZIP).
export async function createMirrorGalleryZip(runs) {
  if (!runs.length) throw new Error('MIRROR_GALLERY_EMPTY');
  const files = await Promise.all(runs.map(async (run) => {
    const path = run.output.path || run.output.uri?.replace(/^file:\/\//, '');
    const info = await stat(path);
    if (!path || !Number(info.size)) throw new Error('MIRROR_GALLERY_FILE_MISSING');
    return { path, size: Number(info.size) };
  }));
  const total = files.reduce((sum, file) => sum + file.size, 0);
  // This writer uses ordinary ZIP, not ZIP64. Reject before writing, never truncate.
  if (total >= 0xffffffff - files.length * 256 || files.length >= 65535) throw new Error('MIRROR_ZIP_TOO_LARGE');
  if ((await getFSInfo()).freeSpace < total + files.length * 256) throw new Error('MIRROR_ZIP_STORAGE_FULL');
  const root = `${CachesDirectoryPath}/kaptura-gallery-exports`;
  await mkdir(root);
  const path = `${root}/${createClientUuid()}.zip`;
  let pending = Promise.resolve();
  let streamError;
  let finished = false;
  const zip = new Zip((error, data, final) => {
    if (error) { streamError = error; return; }
    const bytes = Buffer.from(data).toString('base64');
    pending = pending.then(() => appendFile(path, bytes, 'base64'));
    if (final) finished = true;
  });
  try {
    await writeFile(path, '', 'base64');
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const entry = new ZipPassThrough(`foto-${String(index + 1).padStart(4, '0')}.jpg`);
      zip.add(entry);
      for (let offset = 0; offset < file.size; offset += 256 * 1024) {
        const length = Math.min(256 * 1024, file.size - offset);
        const data = Buffer.from(await read(file.path, length, offset, 'base64'), 'base64');
        if (data.length !== length) throw new Error('MIRROR_ZIP_INCOMPLETE_READ');
        entry.push(data, offset + length === file.size);
        await pending;
        if (streamError) throw streamError;
      }
    }
    zip.end();
    await pending;
    if (streamError || !finished) throw streamError || new Error('MIRROR_ZIP_INCOMPLETE');
    return `file://${path}`;
  } catch (error) {
    zip.terminate();
    await pending.catch(() => {});
    await unlink(path).catch(() => {});
    throw error;
  }
}
