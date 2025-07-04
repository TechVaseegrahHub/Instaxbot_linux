const express = require('express');
const axios = require('axios');

const router = express.Router();

router.get('/proxy-image', async (req, res) => {
  /*console.log('Received proxy request:', {
    url: req.query.url,
    headers: req.headers
  });*/

  try {
    const imageUrl = req.query.url;
    if (!imageUrl) {
      console.log('No URL provided in request');
      return res.status(400).send('Image URL is required');
    }

    //console.log('Fetching image from:', imageUrl);
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

   /* console.log('Image fetched successfully:', {
      contentType: response.headers['content-type'],
      contentLength: response.headers['content-length']
    });*/

    res.setHeader('Content-Type', response.headers['content-type']);
    res.send(response.data);
  } catch (error) {
    console.error('Proxy error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).send('Error fetching image');
  }
});

router.get('/proxy-video', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!videoUrl) {
      return res.status(400).send('Video URL is required');
    }

    const response = await axios({
      method: 'get',
      url: videoUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Set appropriate headers
    res.setHeader('Content-Type', response.headers['content-type']);
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    
    // Enable partial content support
    res.setHeader('Accept-Ranges', 'bytes');

    // Handle range requests for video streaming
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const contentLength = response.headers['content-length'];
      const end = parts[1] ? parseInt(parts[1], 10) : contentLength - 1;
      const chunksize = (end - start) + 1;

      res.setHeader('Content-Range', `bytes ${start}-${end}/${contentLength}`);
      res.setHeader('Content-Length', chunksize);
      res.status(206); // Partial Content
    }

    // Pipe the video stream to response
    response.data.pipe(res);

    // Handle errors during streaming
    response.data.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).send('Error streaming video');
      }
    });

  } catch (error) {
    console.error('Proxy error:', {
      message: error.message,
      stack: error.stack
    });
    
    if (!res.headersSent) {
      res.status(500).send('Error fetching video');
    }
  }
});

module.exports = router;