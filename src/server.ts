import express from 'express';
import cors from 'cors';
import { createReadStream, statSync, unlink } from 'fs';
import { resolve } from 'path';
import ytdl from 'youtube-dl-exec';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

app.get('/download', async (req, res) => {
  const videoUrl = req.query.url as string;
  const format = req.query.format as 'mp3' | 'mp4';

  if (!videoUrl || !format) {
    return res.status(400).send('URL e formato são obrigatórios');
  }

  try {
    const info: any = await ytdl(videoUrl, {
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
    });

    const rawTitle = info.title || 'video';
    const safeTitle = rawTitle.replace(/[\/\\?%*:|"<>]/g, '-');
    const fileExt = format === 'mp3' ? 'mp3' : 'mp4';
    const filename = `${safeTitle}.${fileExt}`;
    const outputPath = resolve(__dirname, '..', filename);

    if (format === 'mp3') {
      await ytdl(videoUrl, {
        output: outputPath,
        extractAudio: true,
        audioFormat: 'mp3',
        noCheckCertificates: true,
      });
    } else {
      await ytdl(videoUrl, {
        output: outputPath,
        format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
        mergeOutputFormat: 'mp4',
      });
    }

    const fileSize = statSync(outputPath).size;

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
    res.setHeader('Content-Length', fileSize);

    const stream = createReadStream(outputPath);
    stream.pipe(res);

    stream.on('close', () => {
      unlink(outputPath, () => {});
    });
  } catch (error) {
    console.error('Erro na conversão:', error);
    res.status(500).send('Falha ao baixar o video.');
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});