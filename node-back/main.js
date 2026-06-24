import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import superagent from 'superagent';

const API_KEY = 'sk-82780589650c4543a2595d5fabbbe384';

const app = express();
const PORT = 13010;

// 中间件
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' })); // 支持大的 base64 图片

// 聊天接口
app.post('/api/chat', async (req, res) => {
    const { image, prompt } = req.body || {};

    const anthropic = new Anthropic({
        apiKey: API_KEY,
        baseURL: 'https://dashscope.aliyuncs.com/apps/anthropic',
    });

    try {
        let content = [{
            type: 'text',
            text: prompt,
        }];
        if (image) {
            content.unshift({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: image,
                },
            });
        }

        const response = await anthropic.messages.create({
            model: 'qwen3.7-plus',
            max_tokens: 2048,
            stream: false,
            messages: [{
                role: 'user',
                content,
            }],
            thinking: { type: 'disabled' },
        });

        const fullText = response.content.at(-1).text;

        res.json({ data: fullText });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// TTS 接口
app.post('/api/tts', async (req, res) => {
    try {
        const { text, lang } = req.body || {};

        const apiData = {
            model: 'cosyvoice-v3-flash',
            input: {
                text,
                voice: 'longyingtao_v3',
                format: 'wav',
                sample_rate: 24000,
                language_hints: [lang],
            },
        };
        const headers = {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        };

        const requestUrl = 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer';
        const response = await superagent.post(requestUrl).send(apiData).set(headers);

        const url = response.body?.output?.audio?.url;
        if (!url) throw new Error('生成失败！');

        res.json({
            data: url,
            format: 'wav',
            sample_rate: 24000,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Express is running at http://localhost:${PORT}`);
});
