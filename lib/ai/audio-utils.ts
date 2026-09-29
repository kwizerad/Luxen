/**
 * Utility to convert raw 16-bit linear PCM audio into a standard RIFF WAV format.
 * Gemini TTS returns raw 24kHz, 16-bit, mono PCM.
 */
export function pcmToWav(pcmBuffer: Buffer, sampleRate: number = 24000, numChannels: number = 1): Buffer {
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;

  const header = Buffer.alloc(44);

  // RIFF identifier
  header.write("RIFF", 0);
  // File size minus 8 bytes
  header.writeUInt32LE(chunkSize, 4);
  // WAVE identifier
  header.write("WAVE", 8);
  // fmt subchunk identifier
  header.write("fmt ", 12);
  // Subchunk1 size (16 for PCM)
  header.writeUInt32LE(16, 16);
  // Audio format (1 = Linear PCM)
  header.writeUInt16LE(1, 20);
  // Number of channels
  header.writeUInt16LE(numChannels, 22);
  // Sample rate
  header.writeUInt32LE(sampleRate, 24);
  // Byte rate
  header.writeUInt32LE(byteRate, 28);
  // Block align
  header.writeUInt16LE(blockAlign, 32);
  // Bits per sample
  header.writeUInt16LE(16, 34);
  // data subchunk identifier
  header.write("data", 36);
  // Data size
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}
